import { NextResponse } from "next/server";
import { getLlmMode, getLlmProviderLabel } from "@/services/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pitchrelay",
    llmMode: getLlmMode(),
    llmProvider: getLlmProviderLabel(),
    ts: new Date().toISOString(),
  });
}
