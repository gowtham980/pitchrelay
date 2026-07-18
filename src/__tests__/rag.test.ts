import { describe, expect, it, beforeAll } from "vitest";
import { loadKb, retrieveKb, buildGroundedContext, resetKbCache } from "@/services/rag";
import fs from "fs";
import path from "path";
import type { StadiumGraph } from "@/domain/types";

let graph: StadiumGraph;

beforeAll(() => {
  resetKbCache();
  graph = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/venue/unity-arena.graph.json"), "utf-8"),
  ) as StadiumGraph;
});

describe("RAG KB", () => {
  it("loads markdown chunks", () => {
    const kb = loadKb();
    expect(kb.length).toBeGreaterThan(5);
    expect(kb.some((c) => c.source.includes("accessibility"))).toBe(true);
  });

  it("retrieves accessibility content for wheelchair queries", () => {
    const hits = retrieveKb("wheelchair route section 142 elevator ADA");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.source.includes("accessibility") || h.text.toLowerCase().includes("wheelchair"))).toBe(
      true,
    );
  });

  it("builds grounded context with citations", () => {
    const { context, citations } = buildGroundedContext(graph, "medical AED Gate B", [
      "med-b",
      "gate-b",
    ]);
    expect(context).toContain("Unity Arena");
    expect(context).toContain("Medical Post B");
    expect(citations.length).toBeGreaterThan(0);
  });
});
