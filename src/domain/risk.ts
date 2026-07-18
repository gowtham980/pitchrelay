import type { Severity, TelemetrySnapshot, ZoneTelemetry } from "./types";

export function densityToStatus(density: number): ZoneTelemetry["status"] {
  if (density >= 0.85) return "congested";
  if (density >= 0.55) return "busy";
  if (density < 0) return "closed";
  return "clear";
}

export function zoneRiskScore(zone: ZoneTelemetry): number {
  const densityScore = zone.density * 50;
  const queueScore = Math.min(zone.queueMin, 60) * 0.6;
  const statusBoost =
    zone.status === "congested" ? 25 : zone.status === "busy" ? 10 : zone.status === "closed" ? 40 : 0;
  return Math.min(100, Math.round(densityScore + queueScore + statusBoost));
}

export function scoreToSeverity(score: number): Severity {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "med";
  return "low";
}

export function rankZonesByRisk(
  snapshot: TelemetrySnapshot,
): Array<{ zoneId: string; score: number; severity: Severity; zone: ZoneTelemetry }> {
  return Object.entries(snapshot.zones)
    .map(([zoneId, zone]) => {
      const score = zoneRiskScore(zone);
      return { zoneId, score, severity: scoreToSeverity(score), zone };
    })
    .sort((a, b) => b.score - a.score);
}

export function transportDelaySeverity(delayMin: number): Severity {
  if (delayMin >= 30) return "critical";
  if (delayMin >= 15) return "high";
  if (delayMin >= 5) return "med";
  return "low";
}

export function weatherAlertSeverity(alert?: string): Severity | null {
  if (!alert) return null;
  const a = alert.toLowerCase();
  if (a.includes("severe") || a.includes("lightning") || a.includes("tornado")) {
    return "critical";
  }
  if (a.includes("storm") || a.includes("hold") || a.includes("wind")) {
    return "high";
  }
  return "med";
}

export function overallVenueRisk(snapshot: TelemetrySnapshot): {
  score: number;
  severity: Severity;
  drivers: string[];
} {
  const zones = rankZonesByRisk(snapshot);
  const top = zones.slice(0, 3);
  const zoneScore = top.length
    ? top.reduce((s, z) => s + z.score, 0) / top.length
    : 0;
  const maxDelay = Math.max(0, ...snapshot.transport.map((t) => t.delayMin));
  const delayScore =
    transportDelaySeverity(maxDelay) === "critical"
      ? 90
      : transportDelaySeverity(maxDelay) === "high"
        ? 70
        : transportDelaySeverity(maxDelay) === "med"
          ? 45
          : 10;
  const wx = weatherAlertSeverity(snapshot.weather.alert);
  const wxScore = wx === "critical" ? 95 : wx === "high" ? 75 : wx === "med" ? 50 : 0;

  const score = Math.round(Math.max(zoneScore, delayScore * 0.8, wxScore));
  const drivers: string[] = [];
  for (const z of top.filter((t) => t.score >= 40)) {
    drivers.push(`${z.zoneId}: density ${(z.zone.density * 100).toFixed(0)}%, queue ${z.zone.queueMin}m`);
  }
  if (maxDelay >= 5) drivers.push(`Transport delay ${maxDelay} min`);
  if (snapshot.weather.alert) drivers.push(`Weather: ${snapshot.weather.alert}`);

  return { score, severity: scoreToSeverity(score), drivers };
}
