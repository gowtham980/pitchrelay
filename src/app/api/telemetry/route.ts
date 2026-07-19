import { NextResponse } from "next/server";
import { readTelemetry } from "@/services/telemetry";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "telemetry", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const data = readTelemetry();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/telemetry]", err);
    return NextResponse.json(
      { error: "Failed to read telemetry" },
      { status: 500 },
    );
  }
}
