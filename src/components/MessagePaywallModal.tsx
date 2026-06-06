import { Link } from "@tanstack/react-router";
import { X, Zap, Crown } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Path (including query string) the user should return to after a successful purchase. */
  returnTo?: string;
};

export function MessagePaywallModal({ open, onClose, returnTo }: Props) {
  if (!open) return null;
  const rt = returnTo && returnTo.startsWith("/") ? returnTo : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-glow">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Daily limit reached</p>
          <h2 className="mt-2 font-display text-2xl font-light">Keep the conversation going.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Grab a 24-hour pass, go Premium, or wait until tomorrow for your free messages to reset.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {/* 24h Pass — $1.99 */}
          <Link
            to="/checkout"
            search={{ product: "message_pass", ...(rt ? { returnTo: rt } : {}) } as any}
            className="flex items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 p-4 transition-colors hover:bg-accent/15"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="font-medium">24-Hour Unlimited Pass</div>
                <div className="text-xs text-muted-foreground">Unlimited messaging for 24 hours</div>
              </div>
            </div>
            <div className="font-display text-lg">$1.99</div>
          </Link>

          {/* Premium Monthly — $15.99 */}
          <Link
            to="/checkout"
            search={{ product: "premium", plan: "1", ...(rt ? { returnTo: rt } : {}) } as any}
            className="flex items-center justify-between rounded-2xl bg-gradient-hero p-4 text-primary-foreground shadow-glow"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Premium Monthly</div>
                <div className="text-xs opacity-90">Unlimited messages · insights+ · priority</div>
              </div>
            </div>
            <div className="font-display text-lg">$15.99<span className="text-xs opacity-80">/mo</span></div>
          </Link>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Or wait until tomorrow — free messages reset every day.
          </p>

          <button
            onClick={onClose}
            className="w-full rounded-full border border-border py-2 text-sm text-muted-foreground hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
