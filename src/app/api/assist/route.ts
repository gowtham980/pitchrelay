import { NextResponse } from "next/server";
import { AssistBodySchema } from "@/domain/decisionSchema";
import { jsonOk, parseJsonBody } from "@/lib/api";
import { rateLimit } from "@/lib/security";
import { runAssist } from "@/services/assist";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "assist", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const parsed = await parseJsonBody(req, AssistBodySchema);
    if (parsed.response) return parsed.response;
    const result = await runAssist(parsed.data);
    return jsonOk(result);
  } catch (err) {
    console.error("[api/assist]", err);
    return NextResponse.json(
      { error: "Assist failed", message: "Could not process request. Try again." },
      { status: 500 },
    );
  }
}
