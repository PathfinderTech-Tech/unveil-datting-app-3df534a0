import { ShieldCheck } from "lucide-react";

export function VerifiedBadge({
  size = "sm",
  showDate,
  date,
}: {
  size?: "xs" | "sm" | "md";
  showDate?: boolean;
  date?: string;
}) {
  const dim =
    size === "xs" ? "h-4 w-4 text-[9px]" : size === "md" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]";
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-logo text-primary-foreground shadow-glow ${dim}`}
        title="Verified profile"
        aria-label="Verified profile"
      >
        <ShieldCheck className="h-3 w-3" />
      </span>
      {showDate && date && (
        <span className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          Verified {date}
        </span>
      )}
    </span>
  );
}
