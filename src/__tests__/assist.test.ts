import { describe, expect, it } from "vitest";
import { detectLang } from "@/services/assist";

describe("detectLang", () => {
  it("keeps English when message mentions section (stadium copy)", () => {
    expect(detectLang("How do I get to section 142?")).toBe("en");
    expect(detectLang("Find section 210 near Gate E")).toBe("en");
  });

  it("detects Spanish from clear ES cues", () => {
    expect(detectLang("¿Cómo llego a la sección 142?")).toBe("es");
    expect(detectLang("Necesito silla de ruedas a la puerta C")).toBe("es");
  });

  it("detects French from strong FR cues, not bare section", () => {
    expect(detectLang("Où est la section 142 ?")).toBe("fr");
    expect(detectLang("Comment aller au fauteuil roulant ?")).toBe("fr");
    expect(detectLang("section 142")).toBe("en");
  });

  it("honors explicit lang and common aliases", () => {
    expect(detectLang("section 142", "es")).toBe("es");
    expect(detectLang("section 142", "fr-FR")).toBe("fr");
    expect(detectLang("hola", "en-US")).toBe("en");
    expect(detectLang("hi", "spanish")).toBe("es");
  });
});
