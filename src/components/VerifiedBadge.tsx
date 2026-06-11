import { ShieldCheck } from "lucide-react";

// Free selfie verification confirms the member's profile photos are really them.
// Badge label is "Photo Verified".
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
        className={`inline-flex items-center justify-center rounded-full ${dim}`}
        style={{
          background: "#39FF14",
          color: "#0a0a0a",
          boxShadow: "0 0 10px -1px rgba(57,255,20,0.75), inset 0 0 0 1px rgba(0,0,0,0.15)",
        }}
        title="Photo Verified"
        aria-label="Photo Verified"
      >
        <ShieldCheck className="h-3 w-3" strokeWidth={3} />
      </span>
      {showLabel && (
        <span className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          Photo Verified
        </span>
      )}
    </span>
  );
}
