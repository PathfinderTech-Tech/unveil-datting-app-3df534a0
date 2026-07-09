import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NativeEntitlementSyncPayload = {
  premium: boolean;
  activePass: boolean;
  verificationBadge: boolean;
  premiumUntil?: string | null;
  activePassUntil?: string | null;
};

const LIFETIME_PREMIUM_UNTIL = "9999-12-31T00:00:00.000Z";

function normalizeIso(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export const syncNativeEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NativeEntitlementSyncPayload) => ({
    premium: !!data.premium,
    activePass: !!data.activePass,
    verificationBadge: !!data.verificationBadge,
    premiumUntil: normalizeIso(data.premiumUntil),
    activePassUntil: normalizeIso(data.activePassUntil),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const premiumUntil = data.premium
      ? (data.premiumUntil ?? LIFETIME_PREMIUM_UNTIL)
      : null;
    const messagePassUntil = data.activePass
      ? (data.activePassUntil ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      : null;

    const tier: "free" | "unveil_plus" = data.premium ? "unveil_plus" : "free";
    const profilePatch: {
      subscription_tier: "free" | "unveil_plus";
      premium_until: string | null;
      message_pass_until: string | null;
      updated_at: string;
      badge_paid?: boolean;
    } = {
      subscription_tier: tier,
      premium_until: premiumUntil,
      message_pass_until: messagePassUntil,
      updated_at: now,
    };
    if (data.verificationBadge) profilePatch.badge_paid = true;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profilePatch)
      .eq("id", context.userId);
    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          tier,
          status: data.premium ? "active" : "canceled",
          product_id: data.premium ? "revenuecat:unveil_premium" : null,
          price_id: data.premium ? "revenuecat" : null,
          current_period_start: now,
          current_period_end: premiumUntil,
          cancel_at_period_end: false,
          environment: "native",
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    return { ok: true as const };
  });