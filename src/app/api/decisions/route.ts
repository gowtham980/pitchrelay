import { DecisionBodySchema } from "@/domain/decisionSchema";
import { handleRoute, jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { assertWriteAllowed, rateLimit } from "@/lib/security";
import { listDecisionCards } from "@/lib/store";
import { generateDecisionCard } from "@/services/decisions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "decisions-get", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  return handleRoute("[api/decisions GET]", "Failed to list decisions", async () =>
    jsonOk({ cards: listDecisionCards() }),
  );
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "decisions-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  return handleRoute("[api/decisions POST]", "Failed to generate decision card", async () => {
    const parsed = await parseJsonBody(req, DecisionBodySchema);
    if (parsed.response) return parsed.response;
    if (!parsed.data.incidentId && !parsed.data.prompt) {
      return jsonError("Provide incidentId or prompt", 400);
    }
    const result = await generateDecisionCard(parsed.data);
    return jsonOk(result);
  });
}
