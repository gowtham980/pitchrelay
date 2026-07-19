import { NextResponse } from "next/server";
import { advanceTelemetry, readTelemetry } from "@/services/telemetry";
import { assertWriteAllowed, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "telemetry-tick", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  try {
    let intensity = 1;
    try {
      const body = (await req.json()) as { intensity?: number };
      if (typeof body.intensity === "number" && Number.isFinite(body.intensity)) {
        intensity = Math.max(0, Math.min(5, body.intensity));
      }
    } catch {
      // empty body ok
    }
    advanceTelemetry(intensity);
    return NextResponse.json(readTelemetry());
  } catch (err) {
    console.error("[api/telemetry/tick]", err);
    return NextResponse.json(
      { error: "Failed to tick telemetry" },
      { status: 500 },
    );
  }
}
