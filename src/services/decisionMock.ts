/**
 * Deterministic Decision Card builder (default when LLM is mock/unavailable).
 * Templates live in decisionTemplates.ts; this module wires store + RAG citations.
 */
import { DecisionCardSchema } from "@/domain/decisionSchema";
import type { DecisionCard, Role, Severity } from "@/domain/types";
import { overallVenueRisk } from "@/domain/risk";
import { getGraph, getIncident, getTelemetry } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";
import { enrichIncidentContext } from "./incidents";
import { getLlmMode } from "./llm";
import { buildGroundedContext } from "./rag";
import { defaultResources, templateForIncidentType } from "./decisionTemplates";

export type MockDecisionInput = {
  incidentId?: string;
  prompt?: string;
  role: Role;
};

export function mockDecisionCard(input: MockDecisionInput): DecisionCard {
  const enriched = input.incidentId ? enrichIncidentContext(input.incidentId) : null;
  const incident = enriched?.incident ?? getIncident(input.incidentId ?? "");
  const telemetry = getTelemetry();
  const risk = overallVenueRisk(telemetry);
  const severity: Severity = incident?.severity ?? risk.severity;
  const zoneId = incident?.zoneId ?? "zone-north";
  const type = incident?.type ?? "ops_brief";
  const template = templateForIncidentType(type, zoneId);

  const situation =
    incident?.summary ??
    input.prompt ??
    `Venue risk ${risk.severity} (score ${risk.score}). Drivers: ${risk.drivers.join("; ") || "nominal"}.`;

  const resources = defaultResources(enriched?.resources.medical, enriched?.resources.staff);

  const graph = getGraph();
  const citationSeeds = [zoneId, enriched?.resources.medical?.id, enriched?.resources.staff?.id].filter(
    (id): id is string => Boolean(id),
  );
  const { citations } = buildGroundedContext(
    graph,
    `${type} ${situation} ${zoneId}`,
    citationSeeds,
  );

  const card: DecisionCard = {
    id: uid("dec"),
    incidentId: input.incidentId,
    createdAt: nowIso(),
    title: template.title,
    severity,
    situation,
    actions: template.actions,
    resources,
    comms: template.comms,
    sustainabilityNote: template.sustainabilityNote,
    citations: citations.length ? citations : ["data/kb/safety.md", "data/kb/gates.md"],
    confidence: getLlmMode() === "mock" ? 0.82 : 0.9,
  };

  return DecisionCardSchema.parse(card);
}
