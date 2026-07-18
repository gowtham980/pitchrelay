import { NextResponse } from "next/server";
import { listScenarios, runScenario } from "@/services/scenarios";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ scenarios: listScenarios() });
  } catch (err) {
    console.error("[api/scenarios GET]", err);
    return NextResponse.json({ error: "Failed to list scenarios" }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const result = await runScenario(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scenario failed";
    const status = message.includes("Unknown") ? 404 : 500;
    console.error("[api/scenarios run]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
