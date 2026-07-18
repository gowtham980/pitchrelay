import { NextResponse } from "next/server";
import { readTelemetry } from "@/services/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
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
