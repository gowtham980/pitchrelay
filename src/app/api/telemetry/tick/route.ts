import { handleRoute, jsonOk } from "@/lib/api";
import { assertWriteAllowed, rateLimit } from "@/lib/security";
import { advanceTelemetry, readTelemetry } from "@/services/telemetry";

export const dynamic = "force-dynamic";

function parseIntensity(body: unknown): number {
  if (
    body &&
    typeof body === "object" &&
    "intensity" in body &&
    typeof (body as { intensity?: unknown }).intensity === "number" &&
    Number.isFinite((body as { intensity: number }).intensity)
  ) {
    return Math.max(0, Math.min(5, (body as { intensity: number }).intensity));
  }
  return 1;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "telemetry-tick", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = assertWriteAllowed(req);
  if (denied) return denied;

  return handleRoute("[api/telemetry/tick]", "Failed to tick telemetry", async () => {
    let intensity = 1;
    try {
      intensity = parseIntensity(await req.json());
    } catch {
      // empty body ok
    }
    advanceTelemetry(intensity);
    return jsonOk(readTelemetry());
  });
}
