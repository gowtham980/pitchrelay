import { describe, expect, it } from "vitest";
import { detectLang } from "@/domain/lang";

describe("detectLang (domain)", () => {
  it("defaults to en for stadium English copy", () => {
    expect(detectLang("How do I get to section 142?")).toBe("en");
  });

  it("detects es/fr from strong cues", () => {
    expect(detectLang("¿Cómo llego a la sección 142?")).toBe("es");
    expect(detectLang("Où est la section 142 ?")).toBe("fr");
  });

  it("honors aliases", () => {
    expect(detectLang("hi", "ES-mx")).toBe("es");
    expect(detectLang("hi", "french")).toBe("fr");
  });
});
