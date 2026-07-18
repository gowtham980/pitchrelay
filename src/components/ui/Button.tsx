import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber";

const variants: Record<Variant, string> = {
  primary:
    "bg-stadium-green text-stadium-bg hover:bg-emerald-400 border-transparent font-semibold",
  secondary:
    "bg-white/5 text-stadium-text hover:bg-white/10 border-white/10",
  ghost: "bg-transparent text-stadium-muted hover:text-white hover:bg-white/5 border-transparent",
  danger: "bg-red-500/20 text-red-200 hover:bg-red-500/30 border-red-500/30",
  amber: "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 border-amber-500/30",
};

export function Button({
  children,
  className,
  variant = "primary",
  disabled,
  type = "button",
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
