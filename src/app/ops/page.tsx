"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ZoneBoard } from "@/components/ops/ZoneBoard";
import { IncidentInbox } from "@/components/ops/IncidentInbox";
import { ScenarioRunner } from "@/components/ops/ScenarioRunner";
import { LiveMeters } from "@/components/telemetry/LiveMeters";
import { DecisionCardView } from "@/components/cards/DecisionCardView";
import { StadiumMap } from "@/components/map/StadiumMap";
import type {
  DecisionCard,
  GraphEdge,
  GraphNode,
  Incident,
  TelemetrySnapshot,
} from "@/domain/types";
import { Button } from "@/components/ui/Button";

export default function OpsPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [risk, setRisk] = useState<{
    score: number;
    severity: string;
    drivers: string[];
  } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [card, setCard] = useState<DecisionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [v, t, i] = await Promise.all([
        fetch("/api/venue").then((r) => r.json()),
        fetch("/api/telemetry").then((r) => r.json()),
        fetch("/api/incidents").then((r) => r.json()),
      ]);
      setNodes(v.nodes ?? []);
      setEdges(v.edges ?? []);
      setTelemetry(t.snapshot ?? null);
      setRisk(t.risk ?? null);
      setIncidents(i.incidents ?? []);
      setError(null);
      if (selected) {
        const upd = (i.incidents as Incident[] | undefined)?.find((x) => x.id === selected.id);
        if (upd) {
          setSelected(upd);
          if (upd.decisionCards[0]) setCard(upd.decisionCards[0]);
        }
      }
    } catch {
      setError("Telemetry/incidents fetch failed");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void fetch("/api/telemetry")
        .then((r) => r.json())
        .then((t) => {
          setTelemetry(t.snapshot ?? null);
          setRisk(t.risk ?? null);
        })
        .catch(() => undefined);
    }, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tick() {
    await fetch("/api/telemetry/tick", { method: "POST", body: "{}" });
    await refresh();
  }

  async function runScenario(id: string) {
    setRunningId(id);
    try {
      const res = await fetch(`/api/scenarios/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scenario failed");
      if (data.telemetry) setTelemetry(data.telemetry);
      if (data.incidents?.[0]) {
        setSelected(data.incidents[0]);
        setCard(data.decisionCards?.[0] ?? data.incidents[0].decisionCards?.[0] ?? null);
      } else if (data.decisionCards?.[0]) {
        setCard(data.decisionCards[0]);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario failed");
    } finally {
      setRunningId(null);
    }
  }

  async function generateFor(inc: Incident) {
    setSelected(inc);
    setGenerating(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: inc.id, role: "ops" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Decision failed");
      setCard(data.card);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell title="Ops Console" subtitle="Zones · incidents · Decision Cards">
      {error ? (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
        <Button variant="secondary" onClick={() => void tick()}>
          Tick telemetry
        </Button>
      </div>

      <div className="space-y-4">
        <ScenarioRunner onRun={(id) => void runScenario(id)} runningId={runningId} />
        <LiveMeters telemetry={telemetry} risk={risk} />

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-5">
            <ZoneBoard telemetry={telemetry} loading={loading} error={error} />
            <StadiumMap
              nodes={nodes}
              edges={edges}
              telemetry={telemetry}
              compact
              highlightPath={
                card?.resources?.map((r) => r.nodeId).filter(Boolean) ?? []
              }
            />
          </div>
          <div className="xl:col-span-4">
            <IncidentInbox
              incidents={incidents}
              selectedId={selected?.id}
              onSelect={(inc) => {
                setSelected(inc);
                setCard(inc.decisionCards[0] ?? null);
              }}
              onGenerate={(inc) => void generateFor(inc)}
              generating={generating}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-3">
            <DecisionCardView
              card={card}
              emptyLabel="Select or generate a card"
              compact
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
