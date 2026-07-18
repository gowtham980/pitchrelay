import { NextResponse } from "next/server";
import { DecisionBodySchema } from "@/domain/decisionSchema";
import { generateDecisionCard } from "@/services/decisions";
import { listDecisionCards } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ cards: listDecisionCards() });
  } catch (err) {
    console.error("[api/decisions GET]", err);
    return NextResponse.json({ error: "Failed to list decisions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
