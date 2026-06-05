import { Link } from "@tanstack/react-router";
import { ShieldCheck, Clock, ArrowRight, Sparkles } from "lucide-react";
import type { VerificationStatus } from "@/hooks/use-verification";

type Variant = "card" | "inline";

export function VerificationGate({
  status = "unverified",
  variant = "card",
  reason,
}: {
  status?: VerificationStatus;
  variant?: Variant;
  reason?: string;
}) {
  const pending = status === "pending";
  const title = pending ? "Verification in review" : "Verification Required";
  const body = pending
    ? "Your identity is being reviewed. This usually takes under 24h. You'll unlock conversations as soon as it's approved."
    : "UNVEIL protects meaningful connections by requiring identity verification before conversations begin.";

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
        {pending ? <Clock className="h-4 w-4 text-primary" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
        <span className="flex-1 text-foreground/80">
          <span className="font-medium text-foreground">{title}.</span> {reason ?? "Verified members only — trust comes first."}
        </span>
        {!pending && (
          <Link
            to="/verify"
            className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-glow"
          >
            Verify now <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-glow">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
        {pending ? <Clock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
      </div>
      <h2 className="mt-5 font-display text-3xl font-light">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{body}</p>
      {reason && (
        <p className="mx-auto mt-2 max-w-md text-xs italic text-foreground/70">{reason}</p>
      )}
      <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-accent" /> Trust comes first.</li>
        <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-accent" /> Meaningful connections begin with verified members.</li>
        <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-accent" /> Verification protects our community from fake profiles and impersonation.</li>
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!pending && (
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <ShieldCheck className="h-4 w-4" /> Verify Now
          </Link>
        )}
        <Link
          to="/safety"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}

export function TrustBadge({
  status,
  size = "sm",
}: {
  status: VerificationStatus;
  size?: "xs" | "sm";
}) {
  const dim = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";
  if (status === "verified") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-primary/10 font-mono uppercase tracking-wider text-primary ${dim}`}>
        <ShieldCheck className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-accent/10 font-mono uppercase tracking-wider text-accent ${dim}`}>
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface font-mono uppercase tracking-wider text-muted-foreground ${dim}`}>
      Unverified
    </span>
  );
}
