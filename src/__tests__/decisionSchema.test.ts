import { describe, expect, it } from "vitest";
import { DecisionCardSchema, AssistBodySchema, IncidentBodySchema } from "@/domain/decisionSchema";

describe("DecisionCardSchema", () => {
  it("accepts a valid card", () => {
    const card = DecisionCardSchema.parse({
      id: "dec_1",
      createdAt: new Date().toISOString(),
      title: "Open Gate D",
      severity: "high",
      situation: "North congested",
      actions: [{ who: "ops", step: "Open overflow Gate D" }],
      resources: [{ nodeId: "gate-d", label: "Gate D", why: "Underutilized" }],
      comms: [
        {
          audience: "fans",
          language: "en",
          channel: "pa",
          draft: "Gate D is now open.",
        },
      ],
      citations: ["data/kb/gates.md"],
      confidence: 0.8,
    });
    expect(card.actions.length).toBe(1);
    expect(card.comms[0].channel).toBe("pa");
  });

  it("rejects missing actions", () => {
    expect(() =>
      DecisionCardSchema.parse({
        id: "x",
        createdAt: "t",
        title: "t",
        severity: "low",
        situation: "s",
        actions: [],
        comms: [
          { audience: "a", language: "en", channel: "pa", draft: "hi" },
        ],
        confidence: 0.5,
      }),
    ).toThrow();
  });

  it("rejects bad severity", () => {
    expect(() =>
      DecisionCardSchema.parse({
        id: "x",
        createdAt: "t",
        title: "t",
        severity: "extreme",
        situation: "s",
        actions: [{ who: "ops", step: "do" }],
        comms: [
          { audience: "a", language: "en", channel: "pa", draft: "hi" },
        ],
        confidence: 0.5,
      }),
    ).toThrow();
  });
});

describe("API body schemas", () => {
  it("validates assist body", () => {
    const a = AssistBodySchema.parse({ message: "Where is Gate A?", role: "fan" });
    expect(a.role).toBe("fan");
  });

  it("validates incident body", () => {
    const i = IncidentBodySchema.parse({
      type: "medical",
      zoneId: "zone-east",
      summary: "Assist needed",
    });
    expect(i.severity).toBe("med");
  });
});
