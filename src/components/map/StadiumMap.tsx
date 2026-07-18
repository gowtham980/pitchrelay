"use client";

import { useMemo } from "react";
import type { GraphEdge, GraphNode, TelemetrySnapshot } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface StadiumMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightPath?: string[];
  telemetry?: TelemetrySnapshot | null;
  className?: string;
  compact?: boolean;
}

function zoneFill(density?: number): string {
  if (density == null) return "rgba(34,197,94,0.08)";
  if (density >= 0.85) return "rgba(239,68,68,0.35)";
  if (density >= 0.55) return "rgba(245,158,11,0.28)";
  return "rgba(34,197,94,0.18)";
}

const typeColor: Record<string, string> = {
  gate: "#38BDF8",
  zone: "#22C55E",
  seat_block: "#A78BFA",
  elevator: "#F59E0B",
  medical: "#EF4444",
  staff_post: "#E5E7EB",
  transport: "#38BDF8",
  exit: "#F87171",
  amenity: "#94A3B8",
  concession: "#FBBF24",
  restroom: "#67E8F9",
  sensory: "#C084FC",
};

export function StadiumMap({
  nodes,
  edges,
  highlightPath = [],
  telemetry,
  className,
  compact,
}: StadiumMapProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const pathSet = useMemo(() => new Set(highlightPath), [highlightPath]);
  const pathEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < highlightPath.length - 1; i++) {
      set.add(`${highlightPath[i]}|${highlightPath[i + 1]}`);
      set.add(`${highlightPath[i + 1]}|${highlightPath[i]}`);
    }
    return set;
  }, [highlightPath]);

  const zones = nodes.filter((n) => n.type === "zone");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-stadium-border bg-[#0a101c]",
        className,
      )}
    >
      <div className="absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-stadium-muted backdrop-blur">
        Unity Arena · live graph
      </div>
      <svg
        viewBox="0 0 100 100"
        className={cn("h-full w-full", compact ? "min-h-[220px]" : "min-h-[320px]")}
        role="img"
        aria-label="Stadium knowledge graph map"
      >
        <defs>
          <radialGradient id="pitchGlow" cx="50%" cy="50%" r="40%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* pitch oval */}
        <ellipse cx="50" cy="50" rx="18" ry="12" fill="url(#pitchGlow)" stroke="#22C55E" strokeOpacity="0.35" />
        <ellipse cx="50" cy="50" rx="18" ry="12" fill="none" stroke="#22C55E" strokeOpacity="0.5" strokeDasharray="2 2" />

        {/* zone heat discs */}
        {zones.map((z) => {
          const d = telemetry?.zones[z.id]?.density;
          return (
            <circle
              key={`heat-${z.id}`}
              cx={z.coords.x}
              cy={z.coords.y}
              r={compact ? 8 : 10}
              fill={zoneFill(d)}
              stroke="rgba(255,255,255,0.06)"
            />
          );
        })}

        {/* edges */}
        {edges.map((e) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return null;
          const onPath = pathEdges.has(`${e.from}|${e.to}`);
          const isStairs = e.kind === "stairs";
          return (
            <line
              key={e.id}
              x1={a.coords.x}
              y1={a.coords.y}
              x2={b.coords.x}
              y2={b.coords.y}
              stroke={onPath ? "#22C55E" : isStairs ? "#4B5563" : "#1F2937"}
              strokeWidth={onPath ? 0.9 : e.ada ? 0.45 : 0.35}
              strokeDasharray={isStairs ? "1.2 0.8" : e.kind === "elevator" ? "0.6 0.6" : undefined}
              opacity={onPath ? 1 : 0.85}
            />
          );
        })}

        {/* nodes */}
        {nodes.map((n) => {
          const active = pathSet.has(n.id);
          const r = n.type === "zone" ? 1.8 : n.type === "gate" ? 1.5 : 1.15;
          return (
            <g key={n.id}>
              <circle
                cx={n.coords.x}
                cy={n.coords.y}
                r={active ? r + 0.7 : r}
                fill={active ? "#22C55E" : typeColor[n.type] ?? "#9CA3AF"}
                stroke={active ? "#bbf7d0" : "rgba(0,0,0,0.4)"}
                strokeWidth={active ? 0.5 : 0.25}
              />
              {(n.type === "gate" || n.type === "seat_block" || active) && (
                <text
                  x={n.coords.x}
                  y={n.coords.y - 2.2}
                  textAnchor="middle"
                  fontSize="2.2"
                  fill={active ? "#ecfdf5" : "#9CA3AF"}
                  className="select-none"
                >
                  {n.name.length > 14 ? n.name.slice(0, 12) + "…" : n.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 border-t border-white/5 px-3 py-2 text-[10px] text-stadium-muted">
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-sky-400" /> Gate
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-purple-400" /> Seat
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-amber-400" /> Elevator
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-red-400" /> Medical
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-stadium-green" /> Path
        </span>
      </div>
    </div>
  );
}
