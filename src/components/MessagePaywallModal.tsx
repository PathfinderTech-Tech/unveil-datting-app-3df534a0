import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Zap, Clock, Crown, Sparkles, Star } from "lucide-react";
import { isIOS } from "@/lib/platform";
import { toast } from "sonner";
import { purchase, type ProductId } from "@/lib/purchases";
import { supabase } from "@/integrations/supabase/client";
import PremiumSuccessOverlay from "@/components/PremiumSuccessOverlay";

type SuccessProduct = "premium" | "premium_quarterly" | "premium_annual" | "message_pass" | "message_pass_2w";
const SUCCESS_MAP: Partial<Record<ProductId, SuccessProduct>> = {
  pass_24h: "message_pass",
  pass_2w: "message_pass_2w",
  premium_monthly: "premium",
  premium_quarterly: "premium_quarterly",
  premium_annual: "premium_annual",
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Limit the user just hit (15 free). */
  dailyLimit?: number;
  /** True when the user is already on a Premium plan. Hides the Premium CTAs. */
  isPremium?: boolean;
  /** Path (including query string) the user should return to after a successful purchase. */
  returnTo?: string;
};

type Option = {
  product: ProductId;
  checkoutKey: string;
  title: string;
  price: string;
  description: string;
  badge?: string;
  badgeTone?: "accent" | "primary";
  icon: React.ReactNode;
  highlight?: boolean;
};

const PASSES: Option[] = [
  {
    product: "pass_24h",
    checkoutKey: "message_pass",
    title: "24-Hour Pass",
    price: "$1.99",
    description: "Unlimited messages & voice notes for 24 hours",
    icon: <Zap className="h-5 w-5 text-accent" />,
  },
  {
    product: "pass_2w",
    checkoutKey: "message_pass_2w",
    title: "2-Week Pass",
    price: "$9.99",
    description: "Unlimited messages & voice notes for 14 days",
    icon: <Clock className="h-5 w-5 text-accent" />,
  },
];

const PREMIUM: Option[] = [
  {
    product: "premium_monthly",
    checkoutKey: "premium_monthly",
    title: "Premium Monthly",
    price: "$15.99",
    description: "Auto-renews monthly",
    icon: <Crown className="h-5 w-5 text-primary" />,
  },
  {
    product: "premium_quarterly",
    checkoutKey: "premium_quarterly",
    title: "Premium 3 Months",
    price: "$39.99",
    description: "Save 17% vs monthly",
    badge: "Most Chosen",
    badgeTone: "primary",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    highlight: true,
  },
  {
    product: "premium_annual",
    checkoutKey: "premium_annual",
    title: "Premium Annual",
    price: "$149.99",
    description: "Auto-renews yearly",
    badge: "Best Value",
    badgeTone: "accent",
    icon: <Star className="h-5 w-5 text-primary" />,
  },
];

export function MessagePaywallModal({ open, onClose, dailyLimit, isPremium, returnTo }: Props) {
  const [successFor, setSuccessFor] = useState<SuccessProduct | null>(null);
  if (!open && !successFor) return null;
  const rt = returnTo && returnTo.startsWith("/") ? returnTo : undefined;
  const limit = dailyLimit ?? 15;

  async function handleIOSPurchase(productId: ProductId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to purchase.");
        return;
      }
      await purchase(productId, user.id);
      const key = SUCCESS_MAP[productId];
      if (key) {
        setSuccessFor(key);
      } else {
        toast.success("Purchase complete!");
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    }
  }

  function renderOption(opt: Option) {
    const content = (
      <>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${opt.highlight ? "bg-primary/20" : "bg-surface-2"}`}>
            {opt.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{opt.title}</span>
              {opt.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-luxury ${
                    opt.badgeTone === "primary"
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{opt.description}</div>
          </div>
        </div>
        <div className="font-display text-lg whitespace-nowrap">{opt.price}</div>
      </>
    );

    const className = `flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
      opt.highlight
        ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
        : "border-border bg-surface/60 hover:bg-surface"
    }`;

    if (isIOS()) {
      return (
        <button
          key={opt.product}
          type="button"
          onClick={() => handleIOSPurchase(opt.product)}
          className={`${className} w-full text-left`}
        >
          {content}
        </button>
      );
    }
    return (
      <Link
        key={opt.product}
        to="/checkout"
        search={{ product: opt.checkoutKey, ...(rt ? { returnTo: rt } : {}) } as any}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <>
      {successFor && (
        <PremiumSuccessOverlay
          product={successFor}
          duration={2000}
          onComplete={() => {
            setSuccessFor(null);
            onClose();
            if (rt && typeof window !== "undefined") {
              window.location.assign(rt);
            }
          }}
        />
      )}
      {open && !successFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur overflow-y-auto">
          <div className="relative my-8 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-glow">
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

            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                Message Passes
              </p>
              <div className="space-y-3">{PASSES.map(renderOption)}</div>
            </div>

            {!isPremium && (
              <div className="mt-5">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                  Premium Plans
                </p>
                <div className="space-y-3">{PREMIUM.map(renderOption)}</div>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full rounded-full border border-border py-2 text-sm text-muted-foreground hover:bg-surface"
            >
              Continue Tomorrow
            </button>
          </div>
        </div>
      )}
    </>
  );
}
