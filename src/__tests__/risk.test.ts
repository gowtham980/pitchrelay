import { describe, expect, it } from "vitest";
import {
  densityToStatus,
  zoneRiskScore,
  scoreToSeverity,
  overallVenueRisk,
  rankZonesByRisk,
} from "@/domain/risk";
import type { TelemetrySnapshot } from "@/domain/types";

const snap: TelemetrySnapshot = {
  ts: new Date().toISOString(),
  zones: {
    "zone-north": { density: 0.9, queueMin: 30, status: "congested" },
    "zone-south": { density: 0.2, queueMin: 2, status: "clear" },
  },
  transport: [{ hubId: "transport-metro", etaMin: 20, mode: "metro", delayMin: 16 }],
  weather: { condition: "storm", tempC: 18, alert: "Severe weather hold" },
  sustainability: { energyKw: 4000, wasteFillPct: 40, transitSharePct: 50 },
};

describe("risk scoring", () => {
  it("maps density to status", () => {
    expect(densityToStatus(0.9)).toBe("congested");
    expect(densityToStatus(0.6)).toBe("busy");
    expect(densityToStatus(0.2)).toBe("clear");
  });

  it("scores congested zones higher", () => {
    const high = zoneRiskScore(snap.zones["zone-north"]);
    const low = zoneRiskScore(snap.zones["zone-south"]);
    expect(high).toBeGreaterThan(low);
    expect(scoreToSeverity(high)).toMatch(/high|critical/);
  });

  it("ranks zones by risk", () => {
    const ranked = rankZonesByRisk(snap);
    expect(ranked[0].zoneId).toBe("zone-north");
  });

  it("computes overall venue risk with drivers", () => {
    const risk = overallVenueRisk(snap);
    expect(risk.score).toBeGreaterThan(50);
    expect(risk.drivers.length).toBeGreaterThan(0);
    expect(risk.severity).toMatch(/high|critical|med/);
  });
});
