import { cn } from "@/lib/utils";

export function PointsBadge({
  points,
  variant,
  hasBonus,
  className,
}: {
  points?: number;
  variant: "earned" | "bonus" | "skip";
  hasBonus?: boolean;
  className?: string;
}) {
  if (variant === "skip") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
          className,
        )}
        style={{ color: "var(--muted-foreground)", borderColor: "var(--border)", background: "transparent" }}
      >
        —
      </span>
    );
  }
  if (variant === "bonus") {
    return (
      <span
        className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", className)}
        style={{ color: "var(--logo-rose)", borderColor: "color-mix(in oklch, var(--logo-purple) 35%, transparent)", background: "color-mix(in oklch, var(--logo-purple) 12%, transparent)" }}
      >
        +{points} bonus
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", className)}
      style={{ color: "var(--logo-gold)", borderColor: "color-mix(in oklch, var(--logo-gold) 30%, transparent)", background: "color-mix(in oklch, var(--logo-gold) 12%, transparent)" }}
    >
      {hasBonus && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      )}
      +{points} pts
    </span>
  );
}
