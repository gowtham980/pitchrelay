import { NextResponse } from "next/server";
import { listScenarios, runScenario } from "@/services/scenarios";
import { assertWriteAllowed, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "scenarios-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    return NextResponse.json({ scenarios: listScenarios() });
  } catch (err) {
    console.error("[api/scenarios GET]", err);
    return NextResponse.json({ error: "Failed to list scenarios" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(req, { name: "scenarios-run", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    // Bound id to simple slug form (avoid path tricks if ever re-routed to FS)
    if (!/^[a-z0-9-]{1,64}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid scenario id" }, { status: 400 });
    }
    const result = await runScenario(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scenario failed";
    const status = message.includes("Unknown") ? 404 : 500;
    console.error("[api/scenarios run]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
