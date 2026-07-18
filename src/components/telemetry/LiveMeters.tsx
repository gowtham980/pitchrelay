"use client";

import type { TelemetrySnapshot } from "@/domain/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function LiveMeters({
  telemetry,
  risk,
}: {
  telemetry?: TelemetrySnapshot | null;
  risk?: { score: number; severity: string; drivers: string[] } | null;
}) {
  const s = telemetry?.sustainability;
  const weather = telemetry?.weather;

  return (
    <Card>
      <CardHeader
        title="Live meters"
        subtitle="Queues · weather · sustainability"
        action={
          risk ? (
            <Badge
              tone={
                risk.severity === "critical"
                  ? "red"
                  : risk.severity === "high"
                    ? "amber"
                    : "green"
              }
            >
              risk {risk.score}
            </Badge>
          ) : null
        }
      />
      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meter
          label="Energy"
          value={s ? `${s.energyKw} kW` : "—"}
          bar={s ? Math.min(100, (s.energyKw / 6000) * 100) : 0}
          color="bg-amber-400"
        />
        <Meter
          label="Waste fill"
          value={s ? `${Math.round(s.wasteFillPct)}%` : "—"}
          bar={s?.wasteFillPct ?? 0}
          color="bg-orange-400"
        />
        <Meter
          label="Transit share"
          value={s ? `${Math.round(s.transitSharePct)}%` : "—"}
          bar={s?.transitSharePct ?? 0}
          color="bg-stadium-green"
        />
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] uppercase tracking-wide text-stadium-muted">Weather</div>
          <div className="mt-1 text-sm font-medium text-white">
            {weather ? `${weather.condition} · ${weather.tempC}°C` : "—"}
          </div>
          {weather?.alert ? (
            <p className="mt-2 text-xs text-amber-200">{weather.alert}</p>
          ) : (
            <p className="mt-2 text-xs text-stadium-muted">No active weather alert</p>
          )}
        </div>
      </div>
      {telemetry?.transport?.length ? (
        <div className="border-t border-white/5 px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {telemetry.transport.map((t) => (
              <Badge key={t.hubId} tone={t.delayMin >= 10 ? "amber" : "blue"}>
                {t.mode}: ETA {t.etaMin}m
                {t.delayMin ? ` (+${t.delayMin}m delay)` : ""}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {risk?.drivers?.length ? (
        <div className="border-t border-white/5 px-3 py-2 text-xs text-stadium-muted">
          Drivers: {risk.drivers.join(" · ")}
        </div>
      ) : null}
    </Card>
  );
}

function Meter({
  label,
  value,
  bar,
  color,
}: {
  label: string;
  value: string;
  bar: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] uppercase tracking-wide text-stadium-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
