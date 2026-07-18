import { getTelemetry, tickTelemetry, mergeTelemetryDelta } from "@/lib/store";
import type { TelemetrySnapshot } from "@/domain/types";
import { overallVenueRisk, rankZonesByRisk } from "@/domain/risk";

export function readTelemetry() {
  const snapshot = getTelemetry();
  const risk = overallVenueRisk(snapshot);
  const zonesRanked = rankZonesByRisk(snapshot);
  return { snapshot, risk, zonesRanked };
}

export function advanceTelemetry(intensity = 1): TelemetrySnapshot {
  return tickTelemetry(intensity);
}

export function applyTelemetryDelta(
  delta: Parameters<typeof mergeTelemetryDelta>[0],
): TelemetrySnapshot {
  return mergeTelemetryDelta(delta);
}
