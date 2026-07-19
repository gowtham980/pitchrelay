/** Supported assist / comms languages. */
export type AppLang = "en" | "es" | "fr";

const ALIASES: Record<string, AppLang> = {
  en: "en",
  eng: "en",
  english: "en",
  "en-us": "en",
  "en-gb": "en",
  es: "es",
  spa: "es",
  spanish: "es",
  "es-es": "es",
  "es-mx": "es",
  fr: "fr",
  fra: "fr",
  french: "fr",
  "fr-fr": "fr",
};

/**
 * Resolve UI/API language.
 * Explicit overrides win; otherwise lightweight cue detection (not full NLP).
 * Avoids treating bare English "section" as French.
 */
export function detectLang(message: string, explicit?: string): AppLang {
  if (explicit) {
    const key = explicit.toLowerCase().trim();
    if (key === "locale") return "en";
    const direct = ALIASES[key];
    if (direct) return direct;
    const short = key.slice(0, 2);
    if (short === "es" || short === "fr" || short === "en") return short;
    return "en";
  }

  if (
    /[¿¡]/.test(message) ||
    /\b(cómo|como|dónde|donde|silla|puerta|sección|seccion|baño|bano|gracias|llegar|ascensor)\b/i.test(
      message,
    )
  ) {
    return "es";
  }

  if (
    /[àâäéèêëïîôùûüçœ]/i.test(message) ||
    /\b(où|comment|s['']il|fauteuil|ascenseur|merci|itinéraire|itineraire|porte\s+\w+|la\s+section|vers\s+la)\b/i.test(
      message,
    )
  ) {
    return "fr";
  }

  return "en";
}
