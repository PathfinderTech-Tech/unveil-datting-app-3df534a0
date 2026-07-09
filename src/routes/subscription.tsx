import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, Clock, Crown, ExternalLink } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";
import { PageBackButton } from "@/components/PageBackButton";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useAuth } from "@/hooks/use-auth";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { getManageSubscriptionUrl } from "@/lib/purchases";
import { isIOS, getPlatform } from "@/lib/platform";
import { RouteErrorScreen } from "@/components/RouteErrorScreen";
import { LoadingTimeoutScreen, LoadingScreen } from "@/components/AppStateScreen";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription Status — UNVEIL" },
      { name: "description", content: "View your active Unveil Premium entitlement, manage subscriptions, and restore purchases." },
    ],
  }),
  errorComponent: ({ error }) => (
    <RouteErrorScreen
      title="Subscription is temporarily unavailable"
      message="Billing details failed on this screen only. Retry or return home while this view recovers."
      error={error}
    />
  ),
  component: SubscriptionStatus,
});

function Row({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-gradient-aura text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-luxury ${active ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground"}`}>
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function SubscriptionStatus() {
  const { user, loading: authLoading } = useAuth();
  const { entitlements, loading } = useEntitlements();
  const loadingTimedOut = useLoadingTimeout(authLoading || loading, 8000);
  const platform = getPlatform();
  const manageUrl = getManageSubscriptionUrl();

  if (authLoading || loading) {
    if (loadingTimedOut) {
      return (
        <div className="min-h-screen">
          <UnveilNav />
          <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
          <LoadingTimeoutScreen
            title="Subscription status is taking longer than expected"
            message="UNVEIL could not finish loading your billing state."
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen">
        <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
        <LoadingScreen label="Loading subscription" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl">Sign in to view your subscription</h1>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-hero px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-glow">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
      <section className="mx-auto max-w-2xl px-4 py-10 md:px-5 md:py-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-3xl font-light md:text-5xl">Subscription status</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isIOS()
              ? "Managed by RevenueCat + Apple StoreKit. Source of truth for all purchases on iOS."
              : "Managed by Stripe on the web. On iOS, purchases route through Apple In-App Purchases."}
            <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase">{platform}</span>
          </p>
        </div>

        {/* Entitlements card */}
        <div className="mt-8 rounded-3xl border border-primary/40 bg-card p-5 shadow-glow md:p-7">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl">Entitlements</h2>
          </div>
          <div className="mt-4">
            <Row
              icon={<Sparkles className="h-4 w-4" />}
              label="Unveil Premium"
              value={
                entitlements.premium
                  ? entitlements.premiumUntil
                    ? `Active · renews ${new Date(entitlements.premiumUntil).toLocaleDateString()}`
                    : "Active"
                  : "Not subscribed"
              }
              active={entitlements.premium}
            />
            <Row
              icon={<Clock className="h-4 w-4" />}
              label="24-Hour Pass"
              value={entitlements.activePass ? "Currently active" : "No active pass"}
              active={entitlements.activePass}
            />
            <Row
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Verification Badge"
              value={entitlements.verificationBadge ? "Owned" : "Not purchased"}
              active={entitlements.verificationBadge}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={manageUrl}
            target={isIOS() ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-3 text-xs font-medium hover:bg-surface-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isIOS() ? "Manage in App Store" : "Manage in billing portal"}
          </a>
          <RestorePurchasesButton className="justify-center !py-3" />
        </div>

        {!entitlements.premium && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center md:p-7">
            <h3 className="font-display text-xl">Upgrade to Unveil Premium</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlimited messaging, deeper insights, and priority discovery.
            </p>
            <Link
              to="/premium"
              className="mt-5 inline-flex rounded-full bg-gradient-hero px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-glow"
            >
              See plans
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Single source of truth on iOS: <span className="font-mono">RevenueCat</span> ·
          Entitlement: <span className="font-mono">unveil_premium</span>
        </p>
      </section>
    </div>
  );
}
