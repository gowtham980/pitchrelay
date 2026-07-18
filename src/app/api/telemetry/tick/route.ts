import { NextResponse } from "next/server";
import { advanceTelemetry, readTelemetry } from "@/services/telemetry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let intensity = 1;
    try {
      const body = (await req.json()) as { intensity?: number };
      if (typeof body.intensity === "number") intensity = body.intensity;
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
