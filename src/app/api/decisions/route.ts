import { NextResponse } from "next/server";
import { DecisionBodySchema } from "@/domain/decisionSchema";
import { generateDecisionCard } from "@/services/decisions";
import { listDecisionCards } from "@/lib/store";
import { assertWriteAllowed, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "decisions-get", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  try {
    return NextResponse.json({ cards: listDecisionCards() });
  } catch (err) {
    console.error("[api/decisions GET]", err);
    return NextResponse.json({ error: "Failed to list decisions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "decisions-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const parsed = DecisionBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (!parsed.data.incidentId && !parsed.data.prompt) {
      return NextResponse.json(
        { error: "Provide incidentId or prompt" },
        { status: 400 },
      );
    }
    const result = await generateDecisionCard(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/decisions POST]", err);
    return NextResponse.json(
      { error: "Failed to generate decision card" },
      { status: 500 },
    );
  }
}
