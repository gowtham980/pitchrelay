import { NextResponse } from "next/server";
import { IncidentBodySchema } from "@/domain/decisionSchema";
import { createIncident, listAllIncidents } from "@/services/incidents";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ incidents: listAllIncidents() });
  } catch (err) {
    console.error("[api/incidents GET]", err);
    return NextResponse.json({ error: "Failed to list incidents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = IncidentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const incident = createIncident(parsed.data);
    return NextResponse.json({ incident }, { status: 201 });
  } catch (err) {
    console.error("[api/incidents POST]", err);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
