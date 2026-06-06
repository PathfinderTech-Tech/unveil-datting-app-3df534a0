import { ShieldCheck } from "lucide-react";

// Selfie/photo onboarding is the trust check. The badge text reads
// "Photo Checked" — no paid verification, no $9.99 unlock.
export function VerifiedBadge({
  size = "sm",
  showLabel = false,
}: {
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  showDate?: boolean;
  date?: string;
}) {
  const dim =
    size === "xs" ? "h-4 w-4 text-[9px]" : size === "md" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]";
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-logo text-primary-foreground shadow-glow ${dim}`}
        title="Photo Checked"
        aria-label="Photo Checked"
      >
        <ShieldCheck className="h-3 w-3" />
      </span>
      {showLabel && (
        <span className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          Photo Checked
        </span>
      )}
    </span>
  );
}
