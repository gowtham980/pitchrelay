import { NextResponse } from "next/server";
import { getGraph } from "@/lib/store";
import { summarizeGraph } from "@/domain/graph";

export const dynamic = "force-dynamic";

export async function GET() {
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
