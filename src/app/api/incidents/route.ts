import { IncidentBodySchema } from "@/domain/decisionSchema";
import { handleRoute, jsonOk, parseJsonBody } from "@/lib/api";
import { assertWriteAllowed, rateLimit } from "@/lib/security";
import { createIncident, listAllIncidents } from "@/services/incidents";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "incidents-get", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  return handleRoute("[api/incidents GET]", "Failed to list incidents", async () =>
    jsonOk({ incidents: listAllIncidents() }),
  );
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "incidents-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  return handleRoute("[api/incidents POST]", "Failed to create incident", async () => {
    const parsed = await parseJsonBody(req, IncidentBodySchema);
    if (parsed.response) return parsed.response;
    const incident = createIncident(parsed.data);
    return jsonOk({ incident }, { status: 201 });
  });
}
