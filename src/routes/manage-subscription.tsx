import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PageBackButton } from "@/components/PageBackButton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CreditCard, Sparkles, RefreshCw, X, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";

export const Route = createFileRoute("/manage-subscription")({
  head: () => ({ meta: [{ title: "Manage Subscription — UNVEIL" }] }),
  component: Manage,
});

const PRICE_LABEL: Record<string, string> = {
  premium_monthly: "Premium · Monthly — $15.99/mo",
  premium_quarterly: "Premium · 3 Months — $39.99",
  premium_annual: "Premium · Annual — $149.99/yr",
  message_pass_24h: "24-Hour Unlimited Pass — $1.99",
  message_pass_2w: "2-Week Unlimited Pass — $9.99",
};

function Manage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const env = getStripeEnvironment();
      const [{ data: p }, { data: extras }, { data: s }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("verified, badge_paid, premium_until").eq("id", user.id).maybeSingle(),
        (supabase as any).rpc("get_my_profile_extras"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("environment", env).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      const extra = Array.isArray(extras) ? extras[0] : extras;
      setProfile(p ? { ...p, subscription_tier: extra?.subscription_tier ?? null } : p);
      setSub(s);
      setTx(t || []);
    })();
  }, [user, loading, navigate]);

  const premiumActive = !!profile?.premium_until && new Date(profile.premium_until) > new Date();
  const isRecurring = !!sub?.stripe_subscription_id;

  async function openPortal() {
    setPortalBusy(true);
    try {
      const res = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
      <section className="mx-auto max-w-4xl px-4 py-10 md:px-5 md:py-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-3xl font-light md:text-5xl">Manage subscription</h1>
        </div>

        {/* Current status */}
        <div className="mt-8 rounded-3xl border border-primary bg-card p-5 shadow-glow md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 className="font-display text-2xl">
                  {premiumActive ? "UNVEIL Premium" : "Free Plan"}
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {premiumActive
                    ? `${isRecurring && !sub?.cancel_at_period_end ? "Renews" : "Access ends"} ${new Date(profile.premium_until).toLocaleDateString()}`
                    : "Free forever"}
                </span>
                {sub?.price_id && (
                  <span className="inline-flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> {PRICE_LABEL[sub.price_id] ?? sub.price_id}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isRecurring && (
                <button
                  onClick={openPortal}
                  disabled={portalBusy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-60"
                >
                  {portalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Billing portal
                </button>
              )}
              <Link
                to="/premium"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Change plan
              </Link>
              <Link
                to="/subscription"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2"
              >
                <Sparkles className="h-3.5 w-3.5" /> Entitlements
              </Link>
              <RestorePurchasesButton />
            </div>
          </div>
        </div>

        {/* Upgrade prompt for free users */}
        {!premiumActive && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-7">
            <h3 className="font-display text-xl">UNVEIL Premium</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlimited messaging, deeper insights, and priority discovery — $15.99 / month. Cancel anytime.
            </p>
            <Link
              to="/checkout"
              search={{ product: "premium" } as any}
              className="mt-5 inline-flex rounded-full bg-gradient-hero px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-glow"
            >
              Upgrade · $15.99/mo
            </Link>
          </div>
        )}

        {/* Payment history */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-7">
          <h3 className="font-display text-xl">Payment history</h3>
          {tx.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-luxury text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 text-left">Item</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-2">{PRICE_LABEL[t.price_id ?? ""] ?? t.kind?.replace(/_/g, " ")}</td>
                      <td className="py-2 text-right font-mono">${(t.amount_cents / 100).toFixed(2)}</td>
                      <td className="py-2"><span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase">{t.status}</span></td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
