import { NextResponse } from "next/server";
import { getGraph } from "@/lib/store";
import { summarizeGraph } from "@/domain/graph";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "venue", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const graph = getGraph();
    const summary = summarizeGraph(graph);
    return NextResponse.json({
      ...summary,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  } catch (err) {
    console.error("[api/venue]", err);
    return NextResponse.json(
      { error: "Failed to load venue graph" },
      { status: 500 },
    );
  }
}
