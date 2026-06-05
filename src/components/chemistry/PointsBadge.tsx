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
        style={{ color: "#7A7876", borderColor: "#2A2A2E", background: "transparent" }}
      >
        —
      </span>
    );
  }
  if (variant === "bonus") {
    return (
      <span
        className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", className)}
        style={{ color: "#A78BFA", borderColor: "rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.10)" }}
      >
        +{points} bonus
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", className)}
      style={{ color: "#E2C896", borderColor: "rgba(201,169,110,0.25)", background: "rgba(201,169,110,0.12)" }}
    >
      {hasBonus && (
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#8B5CF6" }} aria-hidden />
      )}
      +{points} pts
    </span>
  );
}
