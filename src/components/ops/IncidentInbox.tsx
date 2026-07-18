"use client";

import type { DecisionCard, Incident } from "@/domain/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { severityBg } from "@/lib/utils";

export function IncidentInbox({
  incidents,
  selectedId,
  onSelect,
  onGenerate,
  generating,
  loading,
}: {
  incidents: Incident[];
  selectedId?: string | null;
  onSelect: (incident: Incident) => void;
  onGenerate: (incident: Incident) => void;
  generating?: boolean;
  loading?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Incident inbox"
        subtitle={
          incidents.length
            ? `${incidents.length} open-thread item(s)`
            : "No incidents — run a scenario"
        }
      />
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse-soft rounded-xl bg-white/5" />
            ))}
          </div>
        ) : null}

        {!loading && incidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-stadium-muted">
            Inbox clear. Run <strong className="text-white">Prematch surge</strong> or create an
            incident to generate Decision Cards.
          </div>
        ) : null}

        {incidents.map((inc) => {
          const active = selectedId === inc.id;
          const latest: DecisionCard | undefined = inc.decisionCards[0];
          return (
            <button
              key={inc.id}
              type="button"
              onClick={() => onSelect(inc)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${severityBg(
                inc.severity,
              )} ${active ? "ring-2 ring-stadium-green/60" : "hover:bg-white/5"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{inc.type}</span>
                <Badge
                  tone={
                    inc.severity === "critical"
                      ? "red"
                      : inc.severity === "high"
                        ? "amber"
                        : "muted"
                  }
                >
                  {inc.severity}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-stadium-muted">{inc.summary}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-stadium-muted">
                  {inc.zoneId} · {inc.status}
                  {latest ? " · card ready" : ""}
                </span>
                <Button
                  variant="secondary"
                  className="min-h-9 px-2 py-1 text-xs"
                  disabled={generating}
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(inc);
                  }}
                >
                  {generating && active ? "…" : "Decision Card"}
                </Button>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
