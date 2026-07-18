"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const roles = [
  { href: "/fan", label: "Fan" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/ops", label: "Ops" },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [clock, setClock] = useState<string>("--:--:--");
  const [llmMode, setLlmMode] = useState<"live" | "mock" | "...">("...");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setLlmMode(d.llmMode === "live" ? "live" : "mock"))
      .catch(() => setLlmMode("mock"));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-stadium-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stadium-green/15 text-stadium-green ring-1 ring-stadium-green/40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 12h4l2-6 4 12 2-6h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <div className="text-sm font-bold tracking-tight text-white group-hover:text-stadium-green">
                  PitchRelay
                </div>
                <div className="text-[10px] uppercase tracking-widest text-stadium-muted">
                  Unity Arena
                </div>
              </div>
            </Link>
            {title ? (
              <div className="hidden border-l border-white/10 pl-4 md:block">
                <div className="text-sm font-semibold text-white">{title}</div>
                {subtitle ? (
                  <div className="text-xs text-stadium-muted">{subtitle}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {roles.map((r) => {
              const active = pathname === r.href || pathname.startsWith(r.href + "/");
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors min-h-9 inline-flex items-center",
                    active
                      ? "bg-stadium-green text-stadium-bg"
                      : "text-stadium-muted hover:text-white hover:bg-white/5",
                  )}
                >
                  {r.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Badge tone={llmMode === "live" ? "green" : "muted"}>
              LLM {llmMode}
            </Badge>
            <Badge tone="blue" className="tabular-nums">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse-soft" />
              {clock}
            </Badge>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5">{children}</main>
    </div>
  );
}
