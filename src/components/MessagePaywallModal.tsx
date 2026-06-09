import { Link } from "@tanstack/react-router";
import { X, Zap, Crown, Infinity as InfinityIcon } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Limit the user just hit (15 free / 35 monthly premium). */
  dailyLimit?: number;
  /** True when the user is already on the Monthly Premium plan. Hides the monthly CTA. */
  isPremium?: boolean;
  /** Path (including query string) the user should return to after a successful purchase. */
  returnTo?: string;
};

export function MessagePaywallModal({ open, onClose, dailyLimit, isPremium, returnTo }: Props) {
  if (!open) return null;
  const rt = returnTo && returnTo.startsWith("/") ? returnTo : undefined;
  const limit = dailyLimit ?? (isPremium ? 35 : 15);

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
          <h2 className="mt-2 font-display text-2xl font-light">You've used today's {limit} interactions.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Text messages and voice notes share the same daily allowance.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {/* Daily Pass — always offered */}
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
                <div className="font-medium">UNVEIL Daily Pass</div>
                <div className="text-xs text-muted-foreground">Unlimited messages &amp; voice notes for 24 hours</div>
              </div>
            </div>
            <div className="font-display text-lg">$1.99</div>
          </Link>

          {/* Monthly Premium — hidden for monthly users (they already have it) */}
          {!isPremium && (
            <Link
              to="/checkout"
              search={{ product: "premium", ...(rt ? { returnTo: rt } : {}) } as any}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 p-4 transition-colors hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">1-Month Premium</div>
                  <div className="text-xs text-muted-foreground">35 interactions per day</div>
                </div>
              </div>
            </Link>
          )}

          {/* 3-Month Premium — always offered (true unlimited) */}
          <Link
            to="/checkout"
            search={{ product: "premium_quarterly", ...(rt ? { returnTo: rt } : {}) } as any}
            className="flex items-center justify-between rounded-2xl bg-gradient-hero p-4 text-primary-foreground shadow-glow"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <InfinityIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">3-Month Premium</div>
                <div className="text-xs opacity-90">Unlimited messages &amp; voice notes</div>
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="w-full rounded-full border border-border py-2 text-sm text-muted-foreground hover:bg-surface"
          >
            Continue Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
