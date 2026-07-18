import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "green" | "amber" | "red" | "blue" | "muted";
}) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-stadium-text border-white/10",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    muted: "bg-white/5 text-stadium-muted border-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
