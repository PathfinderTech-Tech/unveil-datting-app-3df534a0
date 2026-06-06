import { ShieldCheck } from "lucide-react";
import type { VerificationStatus } from "@/hooks/use-verification";

// Paid verification has been retired. VerificationGate is now a no-op so
// existing call sites (chat, contact-share, date-plan) keep their imports
// without rendering a paywall.
export function VerificationGate(_props: {
  status?: VerificationStatus;
  variant?: "card" | "inline";
  reason?: string;
}) {
  return null;
}

export function TrustBadge({
  status,
  size = "sm",
}: {
  status: VerificationStatus;
  size?: "xs" | "sm";
}) {
  if (status !== "verified") return null;
  const dim = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-primary/10 font-mono uppercase tracking-wider text-primary ${dim}`}>
      <ShieldCheck className="h-3 w-3" /> Photo Checked
    </span>
  );
}
