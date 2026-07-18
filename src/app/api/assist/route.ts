import { NextResponse } from "next/server";
import { AssistBodySchema } from "@/domain/decisionSchema";
import { runAssist } from "@/services/assist";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AssistBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await runAssist(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/assist]", err);
    return NextResponse.json(
      { error: "Assist failed", message: "Could not process request. Try again." },
      { status: 500 },
    );
  }
}
