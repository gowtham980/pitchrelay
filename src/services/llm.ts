import type { LlmMode } from "@/domain/types";

export function getLlmMode(): LlmMode {
  const provider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (provider === "mock") return "mock";
  if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) return "live";
  if (provider === "openai" || provider === "gemini") {
    // provider set but no key
    return "mock";
  }
  return "mock";
}

export function getLlmProviderLabel(): string {
  const mode = getLlmMode();
  if (mode === "mock") return "mock";
  if (process.env.GEMINI_API_KEY && (process.env.LLM_PROVIDER ?? "").toLowerCase() !== "openai") {
    return "gemini";
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Provider-agnostic completion. Returns null on failure so callers use mock.
 */
export async function llmComplete(
  messages: LlmChatMessage[],
  opts: { json?: boolean; temperature?: number } = {},
): Promise<string | null> {
  if (getLlmMode() === "mock") return null;

  const provider = getLlmProviderLabel();

  try {
    if (provider === "gemini") {
      return await geminiComplete(messages, opts);
    }
    return await openaiComplete(messages, opts);
  } catch (err) {
    console.error("[llm] completion failed, falling back to mock", err);
    return null;
  }
}

async function openaiComplete(
  messages: LlmChatMessage[],
  opts: { json?: boolean; temperature?: number },
): Promise<string> {
  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      response_format: opts.json ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

async function geminiComplete(
  messages: LlmChatMessage[],
  opts: { json?: boolean; temperature?: number },
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.LLM_MODEL ?? "gemini-2.0-flash";

  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        responseMimeType: opts.json ? "application/json" : "text/plain",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!content) throw new Error("Empty Gemini response");
  return content;
}
