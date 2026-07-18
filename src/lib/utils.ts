import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function nowIso() {
  return new Date().toISOString();
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-stadium-red";
    case "high":
      return "text-stadium-amber";
    case "med":
      return "text-yellow-300";
    default:
      return "text-stadium-green";
  }
}

export function severityBg(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/20 border-red-500/40";
    case "high":
      return "bg-amber-500/15 border-amber-500/40";
    case "med":
      return "bg-yellow-500/10 border-yellow-500/30";
    default:
      return "bg-emerald-500/10 border-emerald-500/30";
  }
}
