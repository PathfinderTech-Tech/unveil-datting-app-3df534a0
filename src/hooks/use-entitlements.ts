import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { getEntitlements, type Entitlements } from "@/lib/purchases";
import { syncNativeEntitlements } from "@/lib/native-subscription-sync.functions";
import { isNative } from "@/lib/platform";

/**
 * Cross-platform entitlement check.
 *
 * - iOS / Android: reads from RevenueCat (single source of truth on device;
 *   StoreKit on iOS, Google Play Billing v8 on Android).
 * - Web: falls back to the existing Stripe-backed `useSubscription` hook.
 */
export function useEntitlements(): { entitlements: Entitlements; loading: boolean } {
  const { user } = useAuth();
  const sub = useSubscription();
  const [rc, setRc] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setRc({ premium: false, activePass: false, verificationBadge: false });
      setLoading(false);
      return;
    }
    if (!isNative()) {
      setRc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getEntitlements(user.id)
      .then((e) => {
        if (alive) {
          setRc(e);
          setLoading(false);
        }
        // Persist native RevenueCat entitlement state to Supabase so
        // server-side membership gates (quota, profile flags) stay in sync.
        syncNativeEntitlements({
          data: {
            premium: e.premium,
            activePass: e.activePass,
            verificationBadge: e.verificationBadge,
            premiumUntil: e.premiumUntil ?? null,
            activePassUntil: e.activePassUntil ?? null,
          },
        }).catch((error) => {
          console.warn("[entitlements] native sync failed", error);
        });
      })
      .catch(() => {
        if (alive) {
          setRc({ premium: false, activePass: false, verificationBadge: false });
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (isNative() && rc) {
    return { entitlements: rc, loading };
  }

  return {
    entitlements: {
      premium: sub.isPremium,
      activePass: false,
      verificationBadge: sub.isVerified,
    },
    loading: sub.loading,
  };
}
