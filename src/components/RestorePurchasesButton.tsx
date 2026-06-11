import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { restorePurchases } from "@/lib/purchases";
import { isIOS } from "@/lib/platform";

/**
 * Apple guideline 3.1.1 — every app selling auto-renewing or non-consumable
 * IAP must expose a "Restore Purchases" affordance. Rendered on Membership,
 * Settings, and Manage Subscription pages.
 *
 * On the web build (where Stripe is the source of truth) the button is still
 * shown for parity but resolves immediately — it serves as a UX confirmation
 * that there's nothing to restore for the signed-in account.
 */
export function RestorePurchasesButton({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (!user) {
      toast.error("Sign in to restore purchases");
      return;
    }
    setBusy(true);
    try {
      const res = await restorePurchases(user.id);
      if ("error" in res) {
        toast.error(res.error);
      } else if (isIOS()) {
        toast.success("Purchases restored.");
      } else {
        toast.success("Your subscription is managed in your account — nothing to restore on the web.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label="Restore previous purchases"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium text-foreground/85 hover:bg-surface disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {busy ? "Restoring…" : "Restore Purchases"}
    </button>
  );
}
