import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NearbyDiscoverySettings } from "@/components/NearbyDiscoverySettings";
import { TravelModeToggle } from "@/components/TravelModeToggle";
import { FeedbackForm } from "@/components/FeedbackForm";
import { useTranslation } from "react-i18next";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Crown, AlertTriangle, Trash2 } from "lucide-react";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";


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
                  <Link to="/checkout" search={({ product: "message_pass" }) as any} className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-xs text-accent hover:bg-accent/20">
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
            <div className="mt-4"><LanguageSwitcher showSpoken /></div>
          </div>
          <NearbyDiscoverySettings />
          <TravelModeToggle />
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("premium.manageSubscription")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/manage-subscription" className="inline-flex rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow">
                {t("premium.manageSubscription")}
              </Link>
              <RestorePurchasesButton />
            </div>
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

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete account
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete your UNVEIL account, profile, matches, messages, and all related data.
              This cannot be undone. For your safety, the same email cannot register a new account for 24 hours after deletion.
            </p>
            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive/10 px-5 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete my account
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-foreground">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm. You will be signed out immediately.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full max-w-xs rounded-xl border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-destructive"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmOpen(false); setConfirmText(""); }}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-xs hover:bg-surface disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Permanently delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
