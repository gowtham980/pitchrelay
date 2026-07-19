import { handleRoute, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/security";
import { readTelemetry } from "@/services/telemetry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { name: "telemetry", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  return handleRoute("[api/telemetry]", "Failed to read telemetry", async () =>
    jsonOk(readTelemetry()),
  );
}
