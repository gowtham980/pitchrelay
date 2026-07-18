import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

const personas = [
  {
    href: "/fan",
    title: "Enter as Fan",
    blurb: "Multilingual grounded assist, ADA routing, live congestion notes.",
    accent: "from-emerald-500/20 to-transparent",
    cta: "Fan Assist",
  },
  {
    href: "/volunteer",
    title: "Enter as Volunteer",
    blurb: "10-second Decision Cards, phrasebook chips, one-tap escalate.",
    accent: "from-sky-500/20 to-transparent",
    cta: "Volunteer Desk",
  },
  {
    href: "/ops",
    title: "Enter as Ops",
    blurb: "Zone board, incidents, structured cards, scenario runner, sustainability.",
    accent: "from-amber-500/20 to-transparent",
    cta: "Ops Console",
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="grid items-center gap-10 py-6 lg:grid-cols-2 lg:py-12">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-stadium-green/30 bg-stadium-green/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-stadium-green" />
            WC2026 hackathon · fictional Unity Arena
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Signals become{" "}
            <span className="text-stadium-green">Decision Cards</span>
            <span className="text-white"> — not chatbot noise.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-stadium-muted md:text-lg">
            PitchRelay is a shared stadium knowledge graph with GenAI that turns match-day
            telemetry and incidents into auditable actions for fans, volunteers, and ops —
            with ADA-native routing and mock-safe fallbacks.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-stadium-text/90">
            <li className="flex gap-2">
              <span className="text-stadium-green">✓</span> Unity Arena graph · pathfinding ·
              density heat
            </li>
            <li className="flex gap-2">
              <span className="text-stadium-green">✓</span> Zod-validated Decision Cards
              (actions + multi-language comms)
            </li>
            <li className="flex gap-2">
              <span className="text-stadium-green">✓</span> One live state · three personas ·
              three demo scenarios
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ops"
              className="inline-flex min-h-11 items-center rounded-xl bg-stadium-green px-5 text-sm font-semibold text-stadium-bg hover:bg-emerald-400"
            >
              Start ops demo
            </Link>
            <Link
              href="/fan"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
            >
              Try fan assist
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {personas.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`group rounded-2xl border border-white/10 bg-gradient-to-r ${p.accent} bg-stadium-panel/80 p-5 shadow-card transition hover:border-stadium-green/40`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-stadium-green">
                    {p.title}
                  </h2>
                  <p className="mt-1 text-sm text-stadium-muted">{p.blurb}</p>
                </div>
                <span className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-stadium-text">
                  {p.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stadium-muted">
          Live demo strip · 90 seconds
        </h3>
        <ol className="mt-3 grid gap-3 text-sm text-stadium-text md:grid-cols-5">
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-stadium-green">1.</span> Ops → Prematch surge
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-stadium-green">2.</span> Zone heat + Decision Card
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-stadium-green">3.</span> Volunteer task + phrases
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-stadium-green">4.</span> Fan Spanish ADA path
          </li>
          <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-stadium-green">5.</span> Mock/Live badge + sustainability
          </li>
        </ol>
      </section>
    </AppShell>
  );
}
