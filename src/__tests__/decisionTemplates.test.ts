import { describe, expect, it } from "vitest";
import { templateForIncidentType, defaultResources } from "@/services/decisionTemplates";

describe("decisionTemplates", () => {
  it("returns medical template with multi-lang comms", () => {
    const t = templateForIncidentType("medical", "zone-east");
    expect(t.title.toLowerCase()).toContain("medical");
    expect(t.actions.length).toBeGreaterThan(0);
    expect(t.comms.some((c) => c.language === "es")).toBe(true);
    expect(t.comms.some((c) => c.language === "fr")).toBe(true);
  });

  it("returns crowd surge with overflow action", () => {
    const t = templateForIncidentType("crowd_surge", "zone-north");
    expect(t.actions.some((a) => /Gate D/i.test(a.step))).toBe(true);
  });

  it("defaultResources falls back when nodes missing", () => {
    const r = defaultResources(null, null);
    expect(r).toHaveLength(2);
    expect(r[0]?.nodeId).toBeTruthy();
  });
});
