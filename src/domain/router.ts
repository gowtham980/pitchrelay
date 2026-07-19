import { adjacency, getNode } from "./graph";
import { MinHeap } from "./minHeap";
import type { GraphEdge, RouteResult, StadiumGraph } from "./types";

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

function viaPhrase(kind: GraphEdge["kind"]): string {
  switch (kind) {
    case "elevator":
      return "take elevator";
    case "ramp":
      return "use ramp";
    case "stairs":
      return "use stairs";
    default:
      return "walk";
  }
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
    const edgeId = edgeIds[i];
    const fromId = nodeIds[i];
    const toId = nodeIds[i + 1];
    if (!edgeId || !fromId || !toId) continue;
    const edge = edgeMap.get(edgeId);
    const a = getNode(graph, fromId);
    const b = getNode(graph, toId);
    if (!edge || !a || !b) continue;
    steps.push(
      `From ${a.name}, ${viaPhrase(edge.kind)} to ${b.name} (~${Math.round(edge.weightMeters)} m).`,
    );
  }
  const destId = nodeIds[nodeIds.length - 1];
  const dest = destId ? getNode(graph, destId) : undefined;
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

  const byId = graph.nodes.find((n) => n.id.toLowerCase() === q);
  if (byId) return byId.id;

  const byName = graph.nodes.find(
    (n) =>
      n.name.toLowerCase() === q ||
      n.name.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase() === q || q.includes(t.toLowerCase())),
  );
  if (byName) return byName.id;

  const sectionMatch = q.match(/section\s*(\d+)/i) || q.match(/sec(?:ción)?\s*(\d+)/i);
  if (sectionMatch?.[1]) {
    const id = `seat-${sectionMatch[1]}`;
    if (graph.nodes.some((n) => n.id === id)) return id;
  }

  const gateMatch = q.match(/gate\s*([a-z])/i) || q.match(/puerta\s*([a-z])/i);
  if (gateMatch?.[1]) {
    const id = `gate-${gateMatch[1].toLowerCase()}`;
    if (graph.nodes.some((n) => n.id === id)) return id;
  }

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
