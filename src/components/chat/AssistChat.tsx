"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AssistResponse } from "@/domain/types";

export interface ChatItem {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  lang?: string;
  routeNodeIds?: string[];
}

const PROMPTS = [
  { label: "Find elevators", message: "Where are the elevators from Gate A?" },
  { label: "Nearest water", message: "Nearest water fountain from Gate A" },
  { label: "Gate C queue", message: "How do I avoid the Gate C queue?" },
  {
    label: "Sección 142 ADA (ES)",
    message: "¿Cómo llego a la sección 142 en silla de ruedas desde la Puerta A?",
  },
];

export function AssistChat({
  ada,
  lang,
  onRoute,
}: {
  ada: boolean;
  lang: string;
  onRoute?: (nodeIds: string[]) => void;
}) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, loading]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setError(null);
    setItems((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, role: "fan", lang, ada }),
      });
      const data = (await res.json()) as AssistResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Assist failed");
      const nodeIds = data.route?.nodeIds ?? [];
      if (nodeIds.length) onRoute?.(nodeIds);
      setItems((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations,
          lang: data.lang,
          routeNodeIds: nodeIds,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Fan Assist</h2>
            <p className="text-xs text-stadium-muted">
              Grounded multilingual help on the Unity Arena graph
            </p>
          </div>
          <Badge tone={ada ? "green" : "muted"}>{ada ? "ADA on" : "ADA off"}</Badge>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {items.length === 0 && !loading ? (
          <div className="animate-fade-in rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-stadium-muted">
              Ask anything about gates, seats, accessibility, or amenities.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => send(p.message)}
                  className="min-h-11 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stadium-text hover:border-stadium-green/40 hover:text-stadium-green"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {items.map((m, i) => (
          <div
            key={i}
            className={`animate-fade-in flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-stadium-green text-stadium-bg"
                  : "border border-white/10 bg-white/5 text-stadium-text"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.lang && m.role === "assistant" ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="blue">{m.lang.toUpperCase()}</Badge>
                  {m.citations?.slice(0, 3).map((c) => (
                    <Badge key={c} tone="muted">
                      {c.replace("data/kb/", "")}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-stadium-muted">
            <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-stadium-green" />
            Relay thinking…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-white/5 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="assist-input" className="sr-only">
          Message
        </label>
        <input
          id="assist-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a gate, seat, or amenity…"
          className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-stadium-muted focus:border-stadium-green/50"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
