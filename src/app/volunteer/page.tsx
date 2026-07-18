"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DecisionCardView } from "@/components/cards/DecisionCardView";
import type { DecisionCard, Incident } from "@/domain/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const PHRASES = [
  {
    label: "Congestion EN",
    text: "Gate B is busy right now. Gate C or Gate D may be faster — I can walk you partway.",
  },
  {
    label: "Congestion ES",
    text: "La Puerta B está llena ahora. La Puerta C o D pueden ser más rápidas — puedo acompañarle.",
  },
  {
    label: "Medical EN",
    text: "Help is on the way. Please give them space. Nearest AED is at Medical Post B.",
  },
  {
    label: "ADA ES",
    text: "La sección 142 tiene lugares para silla de ruedas y acompañante. Usaremos el ascensor, no las escaleras.",
  },
  {
    label: "Weather FR",
    text: "Pour votre sécurité, les entrées sont temporairement suspendues. Restez à l'abri et suivez le personnel.",
  },
];

export default function VolunteerPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [card, setCard] = useState<DecisionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/incidents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const list = (data.incidents as Incident[]).filter(
        (i) => i.status === "open" || i.status === "acknowledged" || i.status === "escalated",
      );
      setIncidents(list);
      setError(null);
      if (selected) {
        const updated = list.find((i) => i.id === selected.id) ?? null;
        setSelected(updated);
        setCard(updated?.decisionCards[0] ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openTask(inc: Incident) {
    setSelected(inc);
    setCard(inc.decisionCards[0] ?? null);
  }

  async function escalate() {
    if (!selected) return;
    try {
      await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: selected.id,
          prompt: "Volunteer escalation — need ops ownership",
          role: "ops",
        }),
      });
      setToast("Escalated to Ops with a fresh Decision Card");
      await refresh();
    } catch {
      setToast("Escalation failed — retry");
    }
  }

  return (
    <AppShell title="Volunteer" subtitle="Tasks · phrases · escalate">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}
      {toast ? (
        <div className="mb-4 rounded-xl border border-stadium-green/30 bg-stadium-green/10 px-4 py-2 text-sm text-emerald-100">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader
              title="Active tasks"
              subtitle="From open incidents / scenarios"
              action={
                <Button variant="ghost" className="min-h-9 text-xs" onClick={() => void refresh()}>
                  Refresh
                </Button>
              }
            />
            <div className="space-y-2 p-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse-soft rounded-xl bg-white/5" />
                ))
              ) : incidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-stadium-muted">
                  No active tasks — run a scenario from Ops or stand by.
                </div>
              ) : (
                incidents.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => openTask(inc)}
                    className={`w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-stadium-green/40 ${
                      selected?.id === inc.id ? "ring-2 ring-stadium-green/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{inc.type}</span>
                      <Badge tone={inc.severity === "critical" ? "red" : "amber"}>
                        {inc.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-stadium-muted">{inc.summary}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Phrase chips" subtitle="Tap to copy" />
            <div className="flex flex-wrap gap-2 p-3">
              {PHRASES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="min-h-11 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:border-sky-400/40 hover:text-sky-200"
                  onClick={() => {
                    void navigator.clipboard?.writeText(p.text);
                    setToast(`Copied: ${p.label}`);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <DecisionCardView
            card={card}
            emptyLabel="Select a task to see its Decision Card"
            onEscalate={selected ? () => void escalate() : undefined}
          />
        </div>
      </div>
    </AppShell>
  );
}
