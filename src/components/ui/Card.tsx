import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stadium-border bg-stadium-panel/90 shadow-card backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3", className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-stadium-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
