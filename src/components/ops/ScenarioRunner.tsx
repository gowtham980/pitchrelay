"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

const SCENARIOS = [
  {
    id: "prematch-surge",
    name: "Prematch surge",
    blurb: "Gate A/B spike + Metro delay → open overflow",
  },
  {
    id: "medical-gate-b",
    name: "Medical Gate B",
    blurb: "Heat exhaustion assist + AED path",
  },
  {
    id: "weather-hold",
    name: "Severe weather hold",
    blurb: "Lightning hold + multi-language PA",
  },
];

export function ScenarioRunner({
  onRun,
  runningId,
}: {
  onRun: (id: string) => void;
  runningId?: string | null;
}) {
  return (
    <Card>
      <CardHeader title="Scenario runner" subtitle="Demo injectors for judges (~90s)" />
      <div className="grid gap-2 p-3 md:grid-cols-3">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div>
              <div className="text-sm font-semibold text-white">{s.name}</div>
              <p className="mt-1 text-xs text-stadium-muted">{s.blurb}</p>
            </div>
            <Button
              className="mt-3 w-full"
              variant="amber"
              disabled={Boolean(runningId)}
              onClick={() => onRun(s.id)}
            >
              {runningId === s.id ? "Running…" : "Run"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
