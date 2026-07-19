import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { StadiumGraph } from "@/domain/types";
import { findRoute, resolveNodeQuery } from "@/domain/router";
import {
  AssistBodySchema,
  DecisionBodySchema,
  DecisionCardSchema,
  IncidentBodySchema,
} from "@/domain/decisionSchema";
import { runAssist } from "@/services/assist";
import { generateDecisionCard } from "@/services/decisions";
import { createIncident, listAllIncidents } from "@/services/incidents";
import { listScenarios, runScenario } from "@/services/scenarios";
import { advanceTelemetry, readTelemetry } from "@/services/telemetry";
import { getGraph, resetStore } from "@/lib/store";
import { getLlmMode } from "@/services/llm";
import { summarizeGraph } from "@/domain/graph";

/**
 * API-layer smoke tests without spinning HTTP — exercises the same
 * service/domain paths the route handlers call.
 */
describe("API smoke (service layer)", () => {
  beforeAll(() => {
    process.env.LLM_PROVIDER = "mock";
    resetStore();
  });

  it("health-equivalent: mock LLM mode", () => {
    expect(getLlmMode()).toBe("mock");
  });

  it("venue-equivalent: graph loads and summarizes", () => {
    const graph = getGraph();
    const summary = summarizeGraph(graph);
    expect(summary.nodeCount).toBeGreaterThanOrEqual(20);
    expect(graph.nodes.length).toBe(summary.nodeCount);
  });

  it("route-equivalent: ADA path Gate A → Section 142", () => {
    const graph = getGraph();
    const from = resolveNodeQuery(graph, "gate-a") ?? "gate-a";
    const to = resolveNodeQuery(graph, "section 142") ?? "seat-142";
    const route = findRoute(graph, from, to, { ada: true, crowdAware: true });
    expect(route).not.toBeNull();
    expect(route!.nodeIds[0]).toBe(from);
    expect(route!.nodeIds.at(-1)).toBe(to);
  });

  it("assist body schema rejects empty message", () => {
    const bad = AssistBodySchema.safeParse({ message: "" });
    expect(bad.success).toBe(false);
  });

  it("assist-equivalent: English section query stays grounded", async () => {
    const parsed = AssistBodySchema.parse({
      message: "How do I get to section 142?",
      role: "fan",
      lang: "en",
      ada: true,
    });
    const result = await runAssist(parsed);
    expect(result.lang).toBe("en");
    expect(result.mode).toBe("mock");
    expect(result.answer.length).toBeGreaterThan(10);
    expect(result.route?.nodeIds?.length ?? 0).toBeGreaterThan(1);
  });

  it("telemetry tick advances snapshot", () => {
    const before = readTelemetry();
    advanceTelemetry(1);
    const after = readTelemetry();
    expect(after.snapshot.ts).not.toBe(before.snapshot.ts);
  });

  it("incidents create + list", () => {
    const body = IncidentBodySchema.parse({
      type: "congestion",
      severity: "med",
      zoneId: "zone-north",
      summary: "Smoke test queue",
    });
    const incident = createIncident(body);
    expect(incident.id).toBeTruthy();
    expect(listAllIncidents().some((i) => i.id === incident.id)).toBe(true);
  });

  it("decisions generate schema-valid card from prompt", async () => {
    const body = DecisionBodySchema.parse({
      prompt: "North gate surge — open overflow and draft PA",
      role: "ops",
    });
    const result = await generateDecisionCard(body);
    const card = DecisionCardSchema.parse(result.card);
    expect(card.actions.length).toBeGreaterThan(0);
    expect(card.comms.length).toBeGreaterThan(0);
    expect(card.confidence).toBeGreaterThanOrEqual(0);
  });

  it("scenarios list includes prematch-surge and runs", async () => {
    const list = listScenarios();
    expect(list.some((s) => s.id === "prematch-surge")).toBe(true);
    const result = await runScenario("prematch-surge");
    expect(result.scenario.id).toBe("prematch-surge");
    expect(result.incidents.length + result.decisionCards.length).toBeGreaterThan(0);
  });
});

describe("graph seed file integrity", () => {
  it("unity-arena.graph.json is valid StadiumGraph-shaped JSON", () => {
    const p = path.join(process.cwd(), "data/venue/unity-arena.graph.json");
    const graph = JSON.parse(fs.readFileSync(p, "utf-8")) as StadiumGraph;
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(graph.nodes.every((n) => n.id && n.type)).toBe(true);
  });
});
