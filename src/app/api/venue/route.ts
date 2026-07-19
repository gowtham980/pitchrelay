import { summarizeGraph } from "@/domain/graph";
import { handleRoute, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/security";
import { getGraph } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "venue", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  return handleRoute("[api/venue]", "Failed to load venue graph", async () => {
    const graph = getGraph();
    const summary = summarizeGraph(graph);
    return jsonOk({
      ...summary,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  });
}
