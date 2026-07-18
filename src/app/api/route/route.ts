import { NextResponse } from "next/server";
import { getGraph } from "@/lib/store";
import { findRoute, resolveNodeQuery } from "@/domain/router";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromRaw = searchParams.get("from") ?? "";
    const toRaw = searchParams.get("to") ?? "";
    const ada = searchParams.get("ada") === "1" || searchParams.get("ada") === "true";

    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "Query params from and to are required" },
        { status: 400 },
      );
    }

    const graph = getGraph();
    const from = resolveNodeQuery(graph, fromRaw) ?? fromRaw;
    const to = resolveNodeQuery(graph, toRaw) ?? toRaw;
    const route = findRoute(graph, from, to, { ada, crowdAware: true });

    if (!route) {
      return NextResponse.json(
        { error: "No path found", from, to, ada },
        { status: 404 },
      );
    }

    return NextResponse.json({ route });
  } catch (err) {
    console.error("[api/route]", err);
    return NextResponse.json({ error: "Routing failed" }, { status: 500 });
  }
}
