"use client";

import type { TelemetrySnapshot } from "@/domain/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { zoneRiskScore, scoreToSeverity } from "@/domain/risk";

const LABELS: Record<string, string> = {
  "zone-north": "North Concourse",
  "zone-south": "South Concourse",
  "zone-east": "East Bowl",
  "zone-west": "West Bowl",
  "zone-pitch": "Pitch Ring",
};

function statusTone(status: string): "green" | "amber" | "red" | "muted" {
  if (status === "congested" || status === "closed") return "red";
  if (status === "busy") return "amber";
  return "green";
}

export function ZoneBoard({
  telemetry,
  loading,
  error,
}: {
  telemetry?: TelemetrySnapshot | null;
  loading?: boolean;
  error?: string | null;
}) {
  const entries = telemetry ? Object.entries(telemetry.zones) : [];

  return (
    <Card>
      <CardHeader
        title="Zone board"
        subtitle={telemetry ? `Updated ${new Date(telemetry.ts).toLocaleTimeString()}` : "Awaiting telemetry"}
      />
      <div className="p-3">
        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Degraded mode: {error}. Showing last-known state if any.
          </div>
        ) : null}

        {loading && !telemetry ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse-soft rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : null}

        {!loading && !telemetry && !error ? (
          <p className="p-4 text-center text-sm text-stadium-muted">Awaiting telemetry…</p>
        ) : null}

        {entries.length ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {entries.map(([id, z]) => {
              const score = zoneRiskScore(z);
              const sev = scoreToSeverity(score);
              return (
                <div
                  key={id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-white">
                      {LABELS[id] ?? id}
                    </div>
                    <Badge tone={statusTone(z.status)}>{z.status}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        z.density >= 0.85
                          ? "bg-red-500"
                          : z.density >= 0.55
                            ? "bg-amber-400"
                            : "bg-stadium-green"
                      }`}
                      style={{ width: `${Math.round(z.density * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-stadium-muted">
                    <span>{Math.round(z.density * 100)}% density</span>
                    <span>q {z.queueMin}m</span>
                    <span className="uppercase">{sev}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
