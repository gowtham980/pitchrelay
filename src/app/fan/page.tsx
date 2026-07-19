"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AssistChat } from "@/components/chat/AssistChat";
import { StadiumMap } from "@/components/map/StadiumMap";
import { Card } from "@/components/ui/Card";
import { useVenueData } from "@/hooks/useVenueData";

export default function FanPage() {
  const { nodes, edges, telemetry, loading, error } = useVenueData();
  const [path, setPath] = useState<string[]>([]);
  const [ada, setAda] = useState(true);
  const [lang, setLang] = useState("en");

  return (
    <AppShell title="Fan" subtitle="Grounded assist + ADA routes">
      {error ? (
        <div
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm">
          <input
            type="checkbox"
            checked={ada}
            onChange={(e) => setAda(e.target.checked)}
            className="h-4 w-4 accent-stadium-green"
          />
          Wheelchair / ADA route
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm">
          Language
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm"
            aria-label="Answer language"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AssistChat ada={ada} lang={lang} onRoute={setPath} />
        <div className="space-y-4">
          {loading ? (
            <Card className="flex min-h-[320px] items-center justify-center text-sm text-stadium-muted">
              Loading stadium graph…
            </Card>
          ) : (
            <StadiumMap
              nodes={nodes}
              edges={edges}
              telemetry={telemetry}
              highlightPath={path}
            />
          )}
          <Card className="p-4 text-sm text-stadium-muted">
            <p className="font-medium text-white">Tips</p>
            <p className="mt-1">
              Try the Spanish ADA chip, or ask for Section 142 from Gate A. Paths highlight on
              the graph; stairs are excluded when ADA is on.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
