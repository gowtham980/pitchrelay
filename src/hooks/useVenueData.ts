"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphEdge, GraphNode, TelemetrySnapshot } from "@/domain/types";

export type VenueLoadState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  telemetry: TelemetrySnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Shared client loader for graph + telemetry (Fan / map surfaces).
 * Keeps pages thin and error/loading behavior consistent.
 */
export function useVenueData(): VenueLoadState {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [venueRes, teleRes] = await Promise.all([
        fetch("/api/venue"),
        fetch("/api/telemetry"),
      ]);
      if (!venueRes.ok || !teleRes.ok) {
        throw new Error("Venue or telemetry request failed");
      }
      const venue = (await venueRes.json()) as {
        nodes?: GraphNode[];
        edges?: GraphEdge[];
      };
      const tele = (await teleRes.json()) as { snapshot?: TelemetrySnapshot };
      setNodes(venue.nodes ?? []);
      setEdges(venue.edges ?? []);
      setTelemetry(tele.snapshot ?? null);
      setError(null);
    } catch {
      setError("Could not load venue map. Retry shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { nodes, edges, telemetry, loading, error, reload };
}
