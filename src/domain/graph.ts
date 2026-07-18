import type { GraphEdge, GraphNode, StadiumGraph } from "./types";

export function indexNodes(graph: StadiumGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

export function adjacency(
  graph: StadiumGraph,
  opts: { adaOnly?: boolean } = {},
): Map<string, Array<{ edge: GraphEdge; to: string }>> {
  const adj = new Map<string, Array<{ edge: GraphEdge; to: string }>>();

  const push = (from: string, to: string, edge: GraphEdge) => {
    if (opts.adaOnly && !edge.ada) return;
    if (opts.adaOnly && edge.kind === "stairs") return;
    const list = adj.get(from) ?? [];
    list.push({ edge, to });
    adj.set(from, list);
  };

  for (const edge of graph.edges) {
    push(edge.from, edge.to, edge);
    if (edge.bidirectional !== false) {
      push(edge.to, edge.from, edge);
    }
  }
  return adj;
}

export function getNode(graph: StadiumGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function getZoneNodes(graph: StadiumGraph, zoneId: string): GraphNode[] {
  return graph.nodes.filter((n) => n.zoneId === zoneId || n.id === zoneId);
}

export function neighborsOf(
  graph: StadiumGraph,
  nodeId: string,
  types?: GraphNode["type"][],
): GraphNode[] {
  const adj = adjacency(graph);
  const links = adj.get(nodeId) ?? [];
  const nodes = links
    .map((l) => getNode(graph, l.to))
    .filter((n): n is GraphNode => Boolean(n));
  if (!types?.length) return nodes;
  return nodes.filter((n) => types.includes(n.type));
}

export function findNearest(
  graph: StadiumGraph,
  fromId: string,
  predicate: (n: GraphNode) => boolean,
  opts: { adaOnly?: boolean } = {},
): GraphNode | undefined {
  const adj = adjacency(graph, opts);
  const visited = new Set<string>();
  const queue: string[] = [fromId];
  visited.add(fromId);

  while (queue.length) {
    const cur = queue.shift()!;
    const node = getNode(graph, cur);
    if (node && cur !== fromId && predicate(node)) return node;
    for (const link of adj.get(cur) ?? []) {
      if (!visited.has(link.to)) {
        visited.add(link.to);
        queue.push(link.to);
      }
    }
  }
  return undefined;
}

export function nodesByType(graph: StadiumGraph, type: GraphNode["type"]): GraphNode[] {
  return graph.nodes.filter((n) => n.type === type);
}

export function zoneIds(graph: StadiumGraph): string[] {
  return graph.nodes.filter((n) => n.type === "zone").map((n) => n.id);
}

export function summarizeGraph(graph: StadiumGraph) {
  const byType: Record<string, number> = {};
  for (const n of graph.nodes) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }
  return {
    meta: graph.meta,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    byType,
    zones: zoneIds(graph),
  };
}
