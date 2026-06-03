import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NearbyDiscoverySettings } from "@/components/NearbyDiscoverySettings";
import { FeedbackForm } from "@/components/FeedbackForm";
import { useTranslation } from "react-i18next";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Crown, AlertTriangle, Trash2 } from "lucide-react";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UNVEIL" }] }),
  component: Settings,
});

function Settings() {
  const { checking } = useRequireOnboarding();
  const { t } = useTranslation();
  const { quota } = useMessageQuota();
  const navigate = useNavigate();
  const deleteAccountFn = useServerFn(deleteAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const passActive = !!quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date();
  const premiumActive = !!quota.premiumUntil && new Date(quota.premiumUntil) > new Date();

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type "DELETE" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteAccountFn();
      if ("error" in res) {
        toast.error(res.error);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      toast.success("Account deleted. You can re-register in 24 hours.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }
  if (checking) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }
  return (

    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <h1 className="font-display text-3xl font-light md:text-4xl">{t("common.settings")}</h1>
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">Messaging</h2>
            {quota.loading ? (
              <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
            ) : quota.unlimited ? (
              <div className="mt-3 space-y-2 text-sm">
                {premiumActive && (
                  <div className="flex items-center gap-2 text-primary"><Crown className="h-4 w-4" /> Premium active · unlimited messaging</div>
                )}
                {passActive && (
                  <div className="flex items-center gap-2 text-accent"><Zap className="h-4 w-4" /> Daily Pass active · {formatRemainingTime(quota.messagePassUntil)} remaining</div>
                )}
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  {quota.remaining} of {quota.dailyLimit} free messages remaining today. Resets {quota.resetsAt ? new Date(quota.resetsAt).toLocaleTimeString() : "in 24h"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/checkout" search={{ product: "message_pass" } as any} className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-xs text-accent hover:bg-accent/20">
                    <Zap className="h-3 w-3" /> Daily Pass · $1.99
                  </Link>
                  <Link to="/premium" className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-4 py-1.5 text-xs text-primary-foreground shadow-glow">
                    <Crown className="h-3 w-3" /> Go Premium
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("common.language")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Change the interface language anytime.</p>
            <div className="mt-4"><LanguageSwitcher /></div>
          </div>
          <NearbyDiscoverySettings />
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("premium.manageSubscription")}</h2>
            <Link to="/manage-subscription" className="mt-3 inline-flex rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow">
              {t("premium.manageSubscription")}
            </Link>
          </div>
          <FeedbackForm />
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">Legal & support</h2>
            <p className="mt-1 text-xs text-muted-foreground">Policies, guidelines, and help.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Link to="/privacy" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Privacy Policy</Link>
              <Link to="/terms" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Terms of Service</Link>
              <Link to="/community-guidelines" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Community Guidelines</Link>
              <Link to="/refund" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Refund Policy</Link>
              <Link to="/safety" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Safety</Link>
              <Link to="/support" className="rounded-xl border border-border bg-surface/60 px-3 py-2 hover:bg-surface">Support Center</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
