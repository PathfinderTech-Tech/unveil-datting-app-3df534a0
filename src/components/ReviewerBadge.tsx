import { useIsReviewer } from "@/hooks/use-is-reviewer";
import { ShieldCheck } from "lucide-react";

/**
 * Tiny pill rendered when the Apple Review account is logged in.
 * Acts as a visible confirmation that reviewer accommodations are active.
 * Hidden for every other user.
 */
export function ReviewerBadge({ className = "" }: { className?: string }) {
  const isReviewer = useIsReviewer();
  if (!isReviewer) return null;
  return (
    <span
      role="status"
      aria-label="Apple Review account"
      className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-luxury text-accent ${className}`}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden /> Reviewer Mode
    </span>
  );
}
