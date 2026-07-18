"use client";

import type { DecisionCard } from "@/domain/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { severityBg, severityColor } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

function severityTone(s: string): "green" | "amber" | "red" | "muted" {
  if (s === "critical" || s === "high") return s === "critical" ? "red" : "amber";
  if (s === "med") return "amber";
  return "green";
}

export function DecisionCardView({
  card,
  emptyLabel = "Select or generate a Decision Card",
  onEscalate,
  compact,
}: {
  card?: DecisionCard | null;
  emptyLabel?: string;
  onEscalate?: () => void;
  compact?: boolean;
}) {
  const [langIdx, setLangIdx] = useState(0);
  const [applied, setApplied] = useState(false);

  if (!card) {
    return (
      <Card className="flex min-h-[220px] items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/15 text-stadium-muted">
            ▭
          </div>
          <p className="text-sm text-stadium-muted">{emptyLabel}</p>
        </div>
      </Card>
    );
  }

  const comm = card.comms[langIdx] ?? card.comms[0];

  return (
    <Card className={`overflow-hidden animate-fade-in ${severityBg(card.severity)} border`}>
      <div className="flex gap-0">
        <div
          className={`w-1.5 shrink-0 ${
            card.severity === "critical"
              ? "bg-red-500"
              : card.severity === "high"
                ? "bg-amber-500"
                : card.severity === "med"
                  ? "bg-yellow-400"
                  : "bg-emerald-500"
          }`}
          aria-hidden
        />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">{card.title}</h3>
                <Badge tone={severityTone(card.severity)}>
                  <span className={severityColor(card.severity)}>●</span> {card.severity}
                </Badge>
                <Badge tone="muted">conf {(card.confidence * 100).toFixed(0)}%</Badge>
              </div>
              <p className="mt-2 text-sm text-stadium-text/90">{card.situation}</p>
            </div>
          </div>

          <div className={`mt-4 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stadium-muted">
                Actions
              </h4>
              <ul className="mt-2 space-y-2">
                {card.actions.map((a, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-sm"
                  >
                    <Badge tone="blue">{a.who}</Badge>
                    <span>{a.step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stadium-muted">
                Resources
              </h4>
              <ul className="mt-2 space-y-2">
                {card.resources.map((r) => (
                  <li key={r.nodeId} className="rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-sm">
                    <div className="font-medium text-white">{r.label}</div>
                    <div className="text-xs text-stadium-muted">
                      {r.nodeId} — {r.why}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stadium-muted">
                Comms drafts
              </h4>
              <div className="flex flex-wrap gap-1">
                {card.comms.map((c, i) => (
                  <button
                    key={`${c.language}-${i}`}
                    type="button"
                    onClick={() => setLangIdx(i)}
                    className={`rounded-md px-2 py-1 text-[11px] uppercase ${
                      i === langIdx
                        ? "bg-stadium-green text-stadium-bg"
                        : "bg-white/5 text-stadium-muted"
                    }`}
                  >
                    {c.language} · {c.channel}
                  </button>
                ))}
              </div>
            </div>
            {comm ? (
              <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-relaxed">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-stadium-muted">
                  {comm.audience} · {comm.channel}
                </div>
                {comm.draft}
              </div>
            ) : null}
          </div>

          {card.sustainabilityNote ? (
            <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              Sustainability: {card.sustainabilityNote}
            </p>
          ) : null}

          {card.citations?.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {card.citations.map((c) => (
                <Badge key={c} tone="muted">
                  {c}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={applied ? "secondary" : "primary"}
              onClick={() => setApplied(true)}
            >
              {applied ? "Marked applied" : "Mark applied"}
            </Button>
            {onEscalate ? (
              <Button variant="danger" onClick={onEscalate}>
                Escalate to Ops
              </Button>
            ) : null}
            {comm ? (
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard?.writeText(comm.draft)}
              >
                Copy PA draft
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
