import { DecisionCardSchema } from "@/domain/decisionSchema";
import type { DecisionCard, Role, Severity } from "@/domain/types";
import { getGraph, getTelemetry } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";
import { enrichIncidentContext } from "./incidents";
import { llmComplete } from "./llm";
import { buildGroundedContext } from "./rag";

type LiveInput = {
  incidentId?: string;
  prompt?: string;
  role: Role;
};

const LIVE_SYSTEM_PROMPT = `You are PitchRelay Decision Service for Unity Arena match-day ops.
Return ONLY valid JSON matching this schema:
{
  "title": string,
  "severity": "low"|"med"|"high"|"critical",
  "situation": string,
  "actions": [{"who":"ops"|"volunteer"|"fan"|"staff","step":string}],
  "resources": [{"nodeId":string,"label":string,"why":string}],
  "comms": [{"audience":string,"language":string,"channel":"pa"|"radio"|"push"|"signage","draft":string}],
  "sustainabilityNote": string,
  "confidence": number
}
Ground every claim in the provided context. Include at least 2 actions and 2 comms (prefer EN+ES).`;

type LiveLlmPayload = {
  title?: string;
  severity?: Severity;
  situation?: string;
  actions?: DecisionCard["actions"];
  resources?: DecisionCard["resources"];
  comms?: DecisionCard["comms"];
  sustainabilityNote?: string;
  confidence?: number;
};

function parseLivePayload(raw: string): LiveLlmPayload | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    return value as LiveLlmPayload;
  } catch {
    return null;
  }
}

/** Live LLM decision card; returns null on any failure so caller can fall back to mock. */
export async function liveDecisionCard(input: LiveInput): Promise<DecisionCard | null> {
  const graph = getGraph();
  const enriched = input.incidentId ? enrichIncidentContext(input.incidentId) : null;
  const incident = enriched?.incident;
  const telemetry = getTelemetry();
  const query = [incident?.summary, input.prompt, incident?.type, incident?.zoneId]
    .filter(Boolean)
    .join(" ");
  const nodeIds = [
    incident?.zoneId,
    enriched?.resources.medical?.id,
    enriched?.resources.staff?.id,
  ].filter((id): id is string => Boolean(id));
  const { context, citations } = buildGroundedContext(
    graph,
    query || "stadium ops",
    nodeIds,
  );

  const user = `Role requesting: ${input.role}
Incident: ${JSON.stringify(incident ?? null)}
Telemetry snapshot ts=${telemetry.ts} weather=${JSON.stringify(telemetry.weather)}
Context:
${context}
${input.prompt ? `Additional prompt: ${input.prompt}` : ""}`;

  const raw = await llmComplete(
    [
      { role: "system", content: LIVE_SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    { json: true },
  );
  if (!raw) return null;

  try {
    const parsed = parseLivePayload(raw);
    if (!parsed) return null;

    const card: DecisionCard = DecisionCardSchema.parse({
      id: uid("dec"),
      incidentId: input.incidentId,
      createdAt: nowIso(),
      title: parsed.title ?? "Decision",
      severity: parsed.severity ?? incident?.severity ?? "med",
      situation: parsed.situation ?? incident?.summary ?? "Ops brief",
      actions: parsed.actions ?? [],
      resources: parsed.resources ?? [],
      comms: parsed.comms ?? [],
      sustainabilityNote: parsed.sustainabilityNote,
      citations,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.75,
    });
    return card;
  } catch (err) {
    console.error("[decisions] live card parse failed", err);
    return null;
  }
}
