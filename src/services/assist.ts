/**
 * Fan/Volunteer grounded assist: language → route → RAG → mock or live answer.
 */
import type { AssistRequest, AssistResponse, RouteResult } from "@/domain/types";
import { detectLang, type AppLang } from "@/domain/lang";
import { getGraph, getTelemetry } from "@/lib/store";
import { findRoute, resolveNodeQuery } from "@/domain/router";
import { getNode } from "@/domain/graph";
import { buildGroundedContext } from "./rag";
import { getLlmMode, llmComplete } from "./llm";

export { detectLang } from "@/domain/lang";

function extractRouteEndpoints(
  message: string,
  req: AssistRequest,
): { from?: string; to?: string } {
  const graph = getGraph();
  if (req.fromNodeId || req.toNodeId) {
    return { from: req.fromNodeId, to: req.toNodeId };
  }

  const lower = message.toLowerCase();
  const fromTo = lower.match(/from\s+(.+?)\s+to\s+(.+)/i);
  if (fromTo?.[1] && fromTo[2]) {
    return {
      from: resolveNodeQuery(graph, fromTo[1]) ?? undefined,
      to: resolveNodeQuery(graph, fromTo[2]) ?? undefined,
    };
  }

  const aToB = lower.match(/de\s+(.+?)\s+a\s+(.+)/i);
  if (aToB?.[1] && aToB[2]) {
    return {
      from: resolveNodeQuery(graph, aToB[1]) ?? undefined,
      to: resolveNodeQuery(graph, aToB[2]) ?? undefined,
    };
  }

  const to = resolveNodeQuery(graph, message) ?? undefined;
  const from = resolveNodeQuery(graph, "gate a") ?? "gate-a";
  if (to && to !== from) return { from, to };
  return { from, to };
}

function congestedZoneNames(): string[] {
  const telemetry = getTelemetry();
  const graph = getGraph();
  return Object.entries(telemetry.zones)
    .filter(([, z]) => z.status === "congested" || z.density > 0.75)
    .map(([id]) => getNode(graph, id)?.name ?? id);
}

function mockAnswer(
  req: AssistRequest,
  lang: AppLang,
  route: RouteResult | undefined,
  citations: string[],
): string {
  const congested = congestedZoneNames();
  const steps =
    route?.steps?.join(" ") ??
    (lang === "es"
      ? "Consulte el mapa del estadio."
      : lang === "fr"
        ? "Consultez le plan du stade."
        : "See the stadium map for details.");

  const warn =
    congested.length === 0
      ? ""
      : lang === "es"
        ? ` Aviso: congestión en ${congested.join(", ")}.`
        : lang === "fr"
          ? ` Attention: congestion vers ${congested.join(", ")}.`
          : ` Live note: congestion near ${congested.join(", ")}.`;

  const ada = !req.ada
    ? ""
    : lang === "es"
      ? " Ruta ADA activada (ascensores/rampas, sin escaleras)."
      : lang === "fr"
        ? " Itinéraire PMR activé (ascenseurs/rampes uniquement)."
        : " ADA route enabled (elevators/ramps only).";

  const cites = citations.join(", ");
  if (lang === "es") {
    return `En Unity Arena: ${steps}${ada}${warn} Fuentes: ${cites || "mapa del recinto"}.`;
  }
  if (lang === "fr") {
    return `À Unity Arena: ${steps}${ada}${warn} Sources: ${cites || "plan du lieu"}.`;
  }
  return `At Unity Arena: ${steps}${ada}${warn} Citations: ${cites || "venue graph"}.`;
}

async function liveAssistAnswer(args: {
  req: AssistRequest;
  lang: AppLang;
  ada: boolean;
  route: RouteResult | undefined;
  context: string;
}): Promise<string | null> {
  const system = `You are PitchRelay Fan/Volunteer Assist for Unity Arena (fictional WC2026-style venue).
Answer in language code: ${args.lang}.
Be concise (under 120 words). Use only grounded facts from context.
If a route is provided, include the key steps. Mention accessibility when ADA is true.
End with a short citations list of source paths.`;
  const user = `Role: ${args.req.role}
ADA: ${args.ada}
Message: ${args.req.message}
Route JSON: ${JSON.stringify(args.route ?? null)}
Context:
${args.context}`;

  return llmComplete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.4 },
  );
}

export async function runAssist(req: AssistRequest): Promise<AssistResponse> {
  const graph = getGraph();
  const lang = detectLang(req.message, req.lang);
  const ada = Boolean(req.ada);
  const ends = extractRouteEndpoints(req.message, req);

  let route: RouteResult | undefined;
  if (ends.from && ends.to) {
    route = findRoute(graph, ends.from, ends.to, { ada, crowdAware: true }) ?? undefined;
  }

  const nodeIds = [...(route?.nodeIds ?? []), ends.from, ends.to].filter(
    (id): id is string => Boolean(id),
  );
  const { context, citations } = buildGroundedContext(graph, req.message, nodeIds);

  let answer: string | null = null;
  let mode: "live" | "mock" = "mock";

  if (getLlmMode() === "live") {
    answer = await liveAssistAnswer({ req, lang, ada, route, context });
    if (answer) mode = "live";
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
