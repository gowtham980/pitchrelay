import { adjacency, getNode } from "./graph";
import type { GraphEdge, RouteResult, StadiumGraph } from "./types";

interface PQItem {
  id: string;
  dist: number;
}

/** Min-heap priority queue for Dijkstra */
class MinHeap {
  private data: PQItem[] = [];

  push(item: PQItem) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): PQItem | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size() {
    return this.data.length;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p].dist <= this.data[i].dist) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  private bubbleDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].dist < this.data[smallest].dist) smallest = l;
      if (r < n && this.data[r].dist < this.data[smallest].dist) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

function edgeCost(edge: GraphEdge, crowdBoost = 1): number {
  const crowd = edge.crowdFactor ?? 1;
  return edge.weightMeters * Math.max(0.5, crowd) * crowdBoost;
}

/**
 * Weighted Dijkstra pathfinding.
 * When ada=true, only ADA edges are used and stairs are excluded.
 */
export function findRoute(
  graph: StadiumGraph,
  fromId: string,
  toId: string,
  opts: { ada?: boolean; crowdAware?: boolean } = {},
): RouteResult | null {
  const from = getNode(graph, fromId);
  const to = getNode(graph, toId);
  if (!from || !to) return null;
  if (fromId === toId) {
    return {
      nodeIds: [fromId],
      edgeIds: [],
      totalMeters: 0,
      ada: Boolean(opts.ada),
      steps: [`You are already at ${from.name}.`],
      from: fromId,
      to: toId,
    };
  }

  const ada = Boolean(opts.ada);
  const adj = adjacency(graph, { adaOnly: ada });
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: GraphEdge }>();
  const heap = new MinHeap();

  dist.set(fromId, 0);
  heap.push({ id: fromId, dist: 0 });

  while (heap.size) {
    const cur = heap.pop()!;
    if (cur.id === toId) break;
    if (cur.dist > (dist.get(cur.id) ?? Infinity)) continue;

    for (const link of adj.get(cur.id) ?? []) {
      const cost = edgeCost(link.edge, opts.crowdAware ? 1.2 : 1);
      const nextDist = cur.dist + cost;
      if (nextDist < (dist.get(link.to) ?? Infinity)) {
        dist.set(link.to, nextDist);
        prev.set(link.to, { nodeId: cur.id, edge: link.edge });
        heap.push({ id: link.to, dist: nextDist });
      }
    }
  }

  if (!prev.has(toId) && fromId !== toId) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let walk = toId;
  while (walk !== fromId) {
    nodeIds.unshift(walk);
    const p = prev.get(walk);
    if (!p) return null;
    edgeIds.unshift(p.edge.id);
    walk = p.nodeId;
  }
  nodeIds.unshift(fromId);

  const totalMeters = Math.round(dist.get(toId) ?? 0);
  const steps = buildSteps(graph, nodeIds, edgeIds, ada);

  return {
    nodeIds,
    edgeIds,
    totalMeters,
    ada,
    steps,
    from: fromId,
    to: toId,
  };
}

function buildSteps(
  graph: StadiumGraph,
  nodeIds: string[],
  edgeIds: string[],
  ada: boolean,
): string[] {
  const edgeMap = new Map(graph.edges.map((e) => [e.id, e]));
  const steps: string[] = [];
  if (ada) steps.push("ADA route enabled — elevators/ramps only, no stairs.");

  for (let i = 0; i < edgeIds.length; i++) {
    const edge = edgeMap.get(edgeIds[i]);
    const a = getNode(graph, nodeIds[i]);
    const b = getNode(graph, nodeIds[i + 1]);
    if (!edge || !a || !b) continue;
    const via =
      edge.kind === "elevator"
        ? "take elevator"
        : edge.kind === "ramp"
          ? "use ramp"
          : edge.kind === "stairs"
            ? "use stairs"
            : "walk";
    steps.push(
      `From ${a.name}, ${via} to ${b.name} (~${Math.round(edge.weightMeters)} m).`,
    );
  }
  const dest = getNode(graph, nodeIds[nodeIds.length - 1]);
  if (dest) steps.push(`Arrive at ${dest.name}.`);
  return steps;
}

/** Resolve common natural-language targets to node ids */
export function resolveNodeQuery(
  graph: StadiumGraph,
  query: string,
): string | undefined {
  const q = query.toLowerCase().trim();
  if (!q) return undefined;

  // Direct id
  const byId = graph.nodes.find((n) => n.id.toLowerCase() === q);
  if (byId) return byId.id;

  // Name contains
  const byName = graph.nodes.find(
    (n) =>
      n.name.toLowerCase() === q ||
      n.name.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase() === q || q.includes(t.toLowerCase())),
  );
  if (byName) return byName.id;

  // Seat section patterns
  const sectionMatch = q.match(/section\s*(\d+)/i) || q.match(/sec(?:ción)?\s*(\d+)/i);
  if (sectionMatch) {
    const id = `seat-${sectionMatch[1]}`;
    if (graph.nodes.some((n) => n.id === id)) return id;
  }

  const gateMatch = q.match(/gate\s*([a-z])/i) || q.match(/puerta\s*([a-z])/i);
  if (gateMatch) {
    const id = `gate-${gateMatch[1].toLowerCase()}`;
    if (graph.nodes.some((n) => n.id === id)) return id;
  }

  // Keywords
  const keywordMap: Record<string, string[]> = {
    elevator: ["elevator"],
    elevators: ["elevator"],
    ascensor: ["elevator"],
    water: ["water", "fountain"],
    restroom: ["restroom"],
    bathroom: ["restroom"],
    baño: ["restroom"],
    medical: ["medical", "first-aid"],
    aed: ["aed", "medical"],
    sensory: ["sensory"],
    concession: ["concession", "food"],
    food: ["concession", "food"],
    transit: ["transport", "metro", "bus"],
    metro: ["transport", "metro"],
    exit: ["exit"],
  };

  for (const [key, tags] of Object.entries(keywordMap)) {
    if (q.includes(key)) {
      const node = graph.nodes.find((n) =>
        tags.some(
          (t) =>
            n.tags.map((x) => x.toLowerCase()).includes(t) ||
            n.type === t ||
            n.name.toLowerCase().includes(t),
        ),
      );
      if (node) return node.id;
    }
  }

  return undefined;
}
