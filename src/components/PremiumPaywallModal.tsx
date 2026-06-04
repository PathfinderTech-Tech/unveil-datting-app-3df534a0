import { Link } from "@tanstack/react-router";
import { X, Crown, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  feature: string;
  title?: string;
  description?: string;
  bullets?: string[];
};

export function PremiumPaywallModal({
  open,
  onClose,
  feature,
  title = "Unlock with UNVEIL Premium",
  description = "Slow love, deeper signal. Premium opens the next layer.",
  bullets = [
    "Insights+ — full attachment & communication read",
    "Advanced compatibility map",
    "Premium challenge packs",
    "Priority discovery",
  ],
}: Props) {
  useEffect(() => {
    if (open) trackEvent("paywall_viewed", { feature, funnel_stage: "shown" });
  }, [open, feature]);

  function dismiss() {
    trackEvent("paywall_dismissed", { feature, funnel_stage: "dismissed" });
    onClose();
  }


  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-glow">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-hero shadow-glow">
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
            Premium feature
          </p>
          <h2 className="mt-1 font-display text-2xl font-light">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>

        <ul className="mt-5 space-y-2 rounded-2xl border border-border bg-surface/50 p-4">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2">
          <Link
            to="/premium"
            onClick={() => trackEvent("paywall_cta_clicked", { feature, funnel_stage: "converted" })}
            className="block rounded-full bg-gradient-hero py-3 text-center text-sm font-medium text-primary-foreground shadow-glow"
          >
            See membership options
          </Link>
          <button
            onClick={dismiss}
            className="w-full rounded-full border border-border py-2 text-sm text-muted-foreground hover:bg-surface"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
