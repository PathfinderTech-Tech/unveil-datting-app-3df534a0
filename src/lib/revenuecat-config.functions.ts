/**
 * Returns the RevenueCat iOS Public SDK key.
 *
 * The key itself is a *public* SDK key (prefix `appl_`) — RevenueCat designs
 * it to ship inside the iOS binary, since it can only read offerings and
 * call StoreKit on the device. Holding it server-side and handing it to
 * the Capacitor wrapper at runtime keeps it out of the web bundle entirely
 * and satisfies our "no API keys in source / no VITE_ secrets" policy.
 *
 * Web callers receive `null` — Stripe remains the source of truth on web.
 */
import { createServerFn } from "@tanstack/react-start";

export const getRevenueCatConfig = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env.REVENUECAT_IOS_PUBLIC_KEY ?? null;
  return {
    iosPublicKey: apiKey,
    entitlementId: "unveil_premium" as const,
    offeringId: "default" as const,
  };
});
