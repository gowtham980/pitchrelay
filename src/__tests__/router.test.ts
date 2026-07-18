import { describe, expect, it, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import type { StadiumGraph } from "@/domain/types";
import { findRoute, resolveNodeQuery } from "@/domain/router";

let graph: StadiumGraph;

beforeAll(() => {
  const p = path.join(process.cwd(), "data/venue/unity-arena.graph.json");
  graph = JSON.parse(fs.readFileSync(p, "utf-8")) as StadiumGraph;
});

describe("Unity Arena graph seed", () => {
  it("has at least 20 nodes and 20 edges", () => {
    expect(graph.nodes.length).toBeGreaterThanOrEqual(20);
    expect(graph.edges.length).toBeGreaterThanOrEqual(20);
  });
});

describe("findRoute", () => {
  it("finds a path from Gate A to Section 142", () => {
    const route = findRoute(graph, "gate-a", "seat-142", { ada: false });
    expect(route).not.toBeNull();
    expect(route!.nodeIds[0]).toBe("gate-a");
    expect(route!.nodeIds.at(-1)).toBe("seat-142");
    expect(route!.totalMeters).toBeGreaterThan(0);
  });

  it("ADA route avoids stairs-only edges", () => {
    const ada = findRoute(graph, "gate-a", "seat-305", { ada: true });
    const nonAda = findRoute(graph, "gate-a", "seat-305", { ada: false });
    expect(ada).not.toBeNull();
    expect(nonAda).not.toBeNull();

    const edgeMap = new Map(graph.edges.map((e) => [e.id, e]));
    for (const eid of ada!.edgeIds) {
      const e = edgeMap.get(eid)!;
      expect(e.ada).toBe(true);
      expect(e.kind).not.toBe("stairs");
    }
    // ADA path should use elevator somewhere for club level
    const kinds = ada!.edgeIds.map((id) => edgeMap.get(id)!.kind);
    expect(kinds).toContain("elevator");
  });

  it("ADA path to sensory room does not use stairs", () => {
    const route = findRoute(graph, "gate-e", "amenity-sensory", { ada: true });
    expect(route).not.toBeNull();
    const edgeMap = new Map(graph.edges.map((e) => [e.id, e]));
    for (const eid of route!.edgeIds) {
      expect(edgeMap.get(eid)!.kind).not.toBe("stairs");
      expect(edgeMap.get(eid)!.ada).toBe(true);
    }
  });

  it("returns null for unknown nodes", () => {
    expect(findRoute(graph, "nope", "gate-a")).toBeNull();
  });
});

describe("resolveNodeQuery", () => {
  it("resolves section and gate phrases", () => {
    expect(resolveNodeQuery(graph, "section 142")).toBe("seat-142");
    expect(resolveNodeQuery(graph, "Gate B")).toBe("gate-b");
    expect(resolveNodeQuery(graph, "elevator")).toBeTruthy();
  });
});
