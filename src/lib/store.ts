/**
 * In-memory venue state singleton.
 * Held on `globalThis` so Next.js hot reload / multi-module imports share one copy
 * in dev; production is still process-local (not multi-replica safe).
 */
import fs from "fs";
import { dataPath } from "./paths";
import { nowIso, uid } from "./utils";
import type {
  DecisionCard,
  Incident,
  StadiumGraph,
  TelemetrySnapshot,
} from "@/domain/types";
import { densityToStatus } from "@/domain/risk";

interface VenueState {
  graph: StadiumGraph;
  telemetry: TelemetrySnapshot;
  incidents: Incident[];
  decisionLog: DecisionCard[];
  initialized: boolean;
}

type StoreGlobal = typeof globalThis & { __pitchrelayStore?: VenueState };
const globalForStore = globalThis as StoreGlobal;

function loadGraph(): StadiumGraph {
  const p = dataPath("venue", "unity-arena.graph.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as StadiumGraph;
}

function baselineTelemetry(graph: StadiumGraph): TelemetrySnapshot {
  const zones: TelemetrySnapshot["zones"] = {};
  for (const n of graph.nodes.filter((x) => x.type === "zone")) {
    zones[n.id] = {
      density: 0.25,
      queueMin: 3,
      status: "clear",
    };
  }
  return {
    ts: nowIso(),
    zones,
    transport: [
      { hubId: "transport-metro", etaMin: 6, mode: "metro", delayMin: 0 },
      { hubId: "transport-bus", etaMin: 8, mode: "shuttle", delayMin: 1 },
    ],
    weather: { condition: "clear", tempC: 22 },
    sustainability: {
      energyKw: 3100,
      wasteFillPct: 32,
      transitSharePct: 58,
    },
  };
}

function createState(): VenueState {
  const graph = loadGraph();
  return {
    graph,
    telemetry: baselineTelemetry(graph),
    incidents: [],
    decisionLog: [],
    initialized: true,
  };
}

export function getStore(): VenueState {
  if (!globalForStore.__pitchrelayStore) {
    globalForStore.__pitchrelayStore = createState();
  }
  return globalForStore.__pitchrelayStore;
}

export function resetStore() {
  globalForStore.__pitchrelayStore = createState();
  return globalForStore.__pitchrelayStore;
}

export function getGraph(): StadiumGraph {
  return getStore().graph;
}

export function getTelemetry(): TelemetrySnapshot {
  return getStore().telemetry;
}

export function setTelemetry(snap: TelemetrySnapshot) {
  getStore().telemetry = snap;
}

export function listIncidents(): Incident[] {
  return [...getStore().incidents].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
}

export function getIncident(id: string): Incident | undefined {
  return getStore().incidents.find((i) => i.id === id);
}

export function addIncident(
  partial: Omit<Incident, "id" | "ts" | "decisionCards" | "status"> & {
    status?: Incident["status"];
  },
): Incident {
  const incident: Incident = {
    id: uid("inc"),
    ts: nowIso(),
    decisionCards: [],
    status: partial.status ?? "open",
    type: partial.type,
    severity: partial.severity,
    zoneId: partial.zoneId,
    summary: partial.summary,
    assignedRole: partial.assignedRole,
  };
  getStore().incidents.unshift(incident);
  return incident;
}

export function updateIncident(id: string, patch: Partial<Incident>): Incident | undefined {
  const store = getStore();
  const idx = store.incidents.findIndex((i) => i.id === id);
  if (idx < 0) return undefined;
  const current = store.incidents[idx];
  if (!current) return undefined;
  const next: Incident = { ...current, ...patch, id };
  store.incidents[idx] = next;
  return next;
}

export function attachDecisionCard(incidentId: string | undefined, card: DecisionCard) {
  const store = getStore();
  store.decisionLog.unshift(card);
  if (incidentId) {
    const inc = store.incidents.find((i) => i.id === incidentId);
    if (inc) {
      inc.decisionCards = [card, ...inc.decisionCards];
    }
  }
  return card;
}

export function listDecisionCards(): DecisionCard[] {
  return [...getStore().decisionLog];
}

/** Mild random walk on telemetry for live feel */
export function tickTelemetry(intensity = 1): TelemetrySnapshot {
  const store = getStore();
  const t: TelemetrySnapshot = structuredClone(store.telemetry);
  t.ts = nowIso();

  for (const id of Object.keys(t.zones)) {
    const z = t.zones[id];
    if (!z) continue;
    const jitter = (Math.random() - 0.48) * 0.06 * intensity;
    z.density = Math.max(0.05, Math.min(0.98, z.density + jitter));
    z.queueMin = Math.max(
      0,
      Math.round(z.queueMin + (Math.random() - 0.5) * 3 * intensity),
    );
    z.status = densityToStatus(z.density);
  }

  for (const tr of t.transport) {
    tr.delayMin = Math.max(0, tr.delayMin + Math.round((Math.random() - 0.55) * 2 * intensity));
    tr.etaMin = Math.max(1, tr.etaMin + Math.round((Math.random() - 0.5) * 2));
  }

  t.sustainability.energyKw = Math.round(
    t.sustainability.energyKw + (Math.random() - 0.5) * 80 * intensity,
  );
  t.sustainability.wasteFillPct = Math.max(
    10,
    Math.min(99, t.sustainability.wasteFillPct + (Math.random() - 0.4) * 1.5 * intensity),
  );
  t.sustainability.transitSharePct = Math.max(
    20,
    Math.min(90, t.sustainability.transitSharePct + (Math.random() - 0.5) * 2 * intensity),
  );

  store.telemetry = t;
  return t;
}

export function mergeTelemetryDelta(delta: Partial<TelemetrySnapshot> & {
  zones?: Record<string, Partial<TelemetrySnapshot["zones"][string]>>;
}): TelemetrySnapshot {
  const store = getStore();
  const t: TelemetrySnapshot = structuredClone(store.telemetry);
  t.ts = nowIso();

  if (delta.zones) {
    for (const [id, patch] of Object.entries(delta.zones)) {
      t.zones[id] = {
        ...(t.zones[id] ?? { density: 0.2, queueMin: 0, status: "clear" }),
        ...patch,
        status:
          patch.status ??
          densityToStatus(patch.density ?? t.zones[id]?.density ?? 0.2),
      };
    }
  }
  if (delta.transport) t.transport = delta.transport;
  if (delta.weather) t.weather = { ...t.weather, ...delta.weather };
  if (delta.sustainability) {
    t.sustainability = { ...t.sustainability, ...delta.sustainability };
  }

  store.telemetry = t;
  return t;
}
