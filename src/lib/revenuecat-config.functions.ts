/**
 * Returns the RevenueCat public SDK keys for the current native platform.
 *
 * Both keys are *public* SDK keys (iOS prefix `appl_`, Android prefix `goog_`)
 * — RevenueCat designs them to ship inside the native binary, since they can
 * only read offerings and call the underlying store (StoreKit / Google Play
 * Billing v8) on the device. They're held server-side and handed to the
 * Capacitor wrapper at runtime to keep them out of the web bundle and out
 * of source control.
 *
 * Web callers receive `null` for both — Stripe remains the source of truth
 * on web.
 */
import { createServerFn } from "@tanstack/react-start";

export const getRevenueCatConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    iosPublicKey: process.env.REVENUECAT_IOS_PUBLIC_KEY ?? null,
    androidPublicKey: process.env.REVENUECAT_ANDROID_PUBLIC_KEY ?? null,
    entitlementId: "unveil_premium" as const,
    offeringId: "default" as const,
  };
});
