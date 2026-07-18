import type { AssistRequest, AssistResponse } from "@/domain/types";
import { getGraph, getTelemetry } from "@/lib/store";
import { findRoute, resolveNodeQuery } from "@/domain/router";
import { buildGroundedContext } from "./rag";
import { getLlmMode, llmComplete } from "./llm";
import { getNode } from "@/domain/graph";

export function detectLang(message: string, explicit?: string): string {
  if (explicit) {
    const e = explicit.toLowerCase().trim();
    // Accept common aliases (locale tags, full names)
    if (e === "locale") return "en";
    if (e.startsWith("es") || e === "spanish" || e === "spa") return "es";
    if (e.startsWith("fr") || e === "french" || e === "fra") return "fr";
    if (e.startsWith("en") || e === "english" || e === "eng") return "en";
    return e.slice(0, 2);
  }
  const m = message;
  // Spanish: strong cues only (accents, inverted punctuation, clear ES words)
  if (
    /[¿¡]/.test(m) ||
    /\b(cómo|como|dónde|donde|silla|puerta|sección|seccion|baño|bano|gracias|llegar|ascensor)\b/i.test(m)
  ) {
    return "es";
  }
  // French: do NOT match bare English "section" (common stadium copy).
  // Prefer accents + clear FR function words / PMR terms.
  if (
    /[àâäéèêëïîôùûüçœ]/i.test(m) ||
    /\b(où|comment|s['']il|fauteuil|ascenseur|merci|itinéraire|itineraire|porte\s+\w+|la\s+section|vers\s+la)\b/i.test(
      m,
    )
  ) {
    return "fr";
  }
  return "en";
}

function extractRouteEndpoints(
  message: string,
  req: AssistRequest,
): { from?: string; to?: string } {
  const graph = getGraph();
  if (req.fromNodeId || req.toNodeId) {
    return { from: req.fromNodeId, to: req.toNodeId };
  }

  const lower = message.toLowerCase();
  // "from X to Y"
  const fromTo = lower.match(/from\s+(.+?)\s+to\s+(.+)/i);
  if (fromTo) {
    return {
      from: resolveNodeQuery(graph, fromTo[1]),
      to: resolveNodeQuery(graph, fromTo[2]),
    };
  }

  const aToB = lower.match(/de\s+(.+?)\s+a\s+(.+)/i);
  if (aToB) {
    return {
      from: resolveNodeQuery(graph, aToB[1]),
      to: resolveNodeQuery(graph, aToB[2]),
    };
  }

  // destination-only
  const to = resolveNodeQuery(graph, message);
  // default entry
  const from = resolveNodeQuery(graph, "gate a") ?? "gate-a";
  if (to && to !== from) return { from, to };

  // seat patterns already handled in resolve
  return { from, to };
}

function mockAnswer(
  req: AssistRequest,
  lang: string,
  route: AssistResponse["route"],
  citations: string[],
): string {
  const telemetry = getTelemetry();
  const graph = getGraph();
  const congested = Object.entries(telemetry.zones)
    .filter(([, z]) => z.status === "congested" || z.density > 0.75)
    .map(([id]) => getNode(graph, id)?.name ?? id);

  if (lang === "es") {
    const steps = route?.steps?.join(" ") ?? "Consulte el mapa del estadio.";
    const warn = congested.length
      ? ` Aviso: congestión en ${congested.join(", ")}.`
      : "";
    const ada = req.ada ? " Ruta ADA activada (ascensores/rampas, sin escaleras)." : "";
    return `En Unity Arena: ${steps}${ada}${warn} Fuentes: ${citations.join(", ") || "mapa del recinto"}.`;
  }

  if (lang === "fr") {
    const steps = route?.steps?.join(" ") ?? "Consultez le plan du stade.";
    const warn = congested.length
      ? ` Attention: congestion vers ${congested.join(", ")}.`
      : "";
    const ada = req.ada ? " Itinéraire PMR activé (ascenseurs/rampes uniquement)." : "";
    return `À Unity Arena: ${steps}${ada}${warn} Sources: ${citations.join(", ") || "plan du lieu"}.`;
  }

  const steps = route?.steps?.join(" ") ?? "See the stadium map for details.";
  const warn = congested.length
    ? ` Live note: congestion near ${congested.join(", ")}.`
    : "";
  const ada = req.ada ? " ADA route enabled (elevators/ramps only)." : "";
  return `At Unity Arena: ${steps}${ada}${warn} Citations: ${citations.join(", ") || "venue graph"}.`;
}

export async function runAssist(req: AssistRequest): Promise<AssistResponse> {
  const graph = getGraph();
  const lang = detectLang(req.message, req.lang);
  const ada = Boolean(req.ada);
  const ends = extractRouteEndpoints(req.message, req);

  let route: AssistResponse["route"] | undefined;
  if (ends.from && ends.to) {
    route = findRoute(graph, ends.from, ends.to, { ada, crowdAware: true }) ?? undefined;
  }

  const nodeIds = [...(route?.nodeIds ?? []), ends.from, ends.to].filter(
    Boolean,
  ) as string[];
  const { context, citations } = buildGroundedContext(graph, req.message, nodeIds);

  let answer: string | null = null;
  let mode: "live" | "mock" = "mock";

  if (getLlmMode() === "live") {
    const system = `You are PitchRelay Fan/Volunteer Assist for Unity Arena (fictional WC2026-style venue).
Answer in language code: ${lang}.
Be concise (under 120 words). Use only grounded facts from context.
If a route is provided, include the key steps. Mention accessibility when ADA is true.
End with a short citations list of source paths.`;
    const user = `Role: ${req.role}
ADA: ${ada}
Message: ${req.message}
Route JSON: ${JSON.stringify(route ?? null)}
Context:
${context}`;

    const raw = await llmComplete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.4 },
    );
    if (raw) {
      answer = raw;
      mode = "live";
    }
  }

  if (!answer) {
    answer = mockAnswer(req, lang, route, citations);
    mode = "mock";
  }

  return {
    answer,
    lang,
    route,
    citations,
    mode,
  };
}
