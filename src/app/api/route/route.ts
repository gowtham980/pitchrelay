import { findRoute, resolveNodeQuery } from "@/domain/router";
import { handleRoute, jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/security";
import { getGraph } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "route", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  return handleRoute("[api/route]", "Routing failed", async () => {
    const { searchParams } = new URL(req.url);
    const fromRaw = (searchParams.get("from") ?? "").slice(0, 80);
    const toRaw = (searchParams.get("to") ?? "").slice(0, 80);
    const ada = searchParams.get("ada") === "1" || searchParams.get("ada") === "true";

    if (!fromRaw || !toRaw) {
      return jsonError("Query params from and to are required", 400);
    }

    const graph = getGraph();
    const from = resolveNodeQuery(graph, fromRaw) ?? fromRaw;
    const to = resolveNodeQuery(graph, toRaw) ?? toRaw;
    const route = findRoute(graph, from, to, { ada, crowdAware: true });

    if (!route) {
      return jsonError("No path found", 404, { from, to, ada });
    }

    return jsonOk({ route });
  });
}
