/**
 * Unified purchases / entitlement layer
 * --------------------------------------
 * Web     → existing Stripe Embedded Checkout (createCheckoutSession + Stripe webhook).
 * iOS     → RevenueCat SDK (StoreKit under the hood; receipts + restore handled by RC).
 * Android → RevenueCat SDK (Google Play Billing Library v8 under the hood;
 *           acknowledgement, server-side receipt validation, and restore are
 *           handled automatically by RC — Google requires acknowledgement
 *           within 3 days or the purchase auto-refunds).
 *
 * Entitlement (single source of truth on native): `unveil_premium`
 *
 * Products (App Store Connect / Google Play Console IDs must match the
 * RevenueCat product IDs below):
 *   - premium_monthly      (auto-renewing subscription — $15.99 / month)
 *   - premium_quarterly    (auto-renewing subscription — $39.99 / 3 months)
 *   - premium_annual       (auto-renewing subscription — $149.99 / year)
 *   - pass_24h             (consumable — Daily Pass, $1.99)
 *   - pass_2w              (consumable — Two-Week Unlimited Pass, $9.99)
 *   - verification_badge   (non-consumable — one-time verification fee)
 *
 * The RevenueCat SDK is loaded dynamically inside `loadRC()` so the web
 * bundle stays free of native-only code.
 */
import { isIOS, isAndroid, isNative } from "./platform";
import { getRevenueCatConfig } from "./revenuecat-config.functions";

export type ProductId =
  | "premium_monthly"
  | "premium_quarterly"
  | "premium_annual"
  | "pass_24h"
  | "pass_2w"
  | "verification_badge";

export const PREMIUM_ENTITLEMENT_ID = "unveil_premium" as const;

export interface PurchaseOffer {
  productId: ProductId;
  displayPrice: string;
  title: string;
  description: string;
}

export interface Entitlements {
  premium: boolean;
  activePass: boolean;
  activePassUntil?: string | null;
  verificationBadge: boolean;
  premiumUntil?: string | null;
}

interface RCConfig {
  iosPublicKey: string | null;
  androidPublicKey: string | null;
  entitlementId: "unveil_premium";
  offeringId: "default";
}

let rcReady: Promise<unknown> | null = null;
let rcConfig: RCConfig | null = null;

async function getConfig(): Promise<RCConfig> {
  if (rcConfig) return rcConfig;
  rcConfig = (await getRevenueCatConfig()) as RCConfig;
  return rcConfig;
}

/**
 * Lazy-load + initialise the RevenueCat Capacitor SDK on the current
 * native platform (iOS → StoreKit, Android → Google Play Billing v8).
 * @internal
 */
async function loadRC(userId: string): Promise<unknown> {
  if (!isNative()) throw new Error("RevenueCat is only available on native (iOS / Android)");
  const cfg = await getConfig();
  const apiKey = isIOS() ? cfg.iosPublicKey : cfg.androidPublicKey;
  if (!apiKey) {
    throw new Error(
      `RevenueCat ${isIOS() ? "iOS" : "Android"} public key not configured on server`,
    );
  }
  if (rcReady) return rcReady;
  rcReady = (async () => {
    const specifier = "@revenuecat/purchases-capacitor";
    const mod = (await import(/* @vite-ignore */ specifier).catch(() => null)) as null | {
      Purchases: {
        configure: (opts: { apiKey: string; appUserID: string }) => Promise<void>;
      };
    };
    if (!mod) {
      throw new Error(
        "RevenueCat SDK not bundled. Run `bun add @revenuecat/purchases-capacitor` before the native build.",
      );
    }
    await mod.Purchases.configure({ apiKey, appUserID: userId });
    return mod.Purchases;
  })();
  return rcReady;
}

/**
 * List purchasable offers for the current platform.
 * Web returns the static catalog. Native returns the live offering from
 * RevenueCat (StoreKit on iOS, Google Play Billing on Android).
 */
export async function getOffers(userId: string): Promise<PurchaseOffer[]> {
  if (isNative()) {
    const Purchases = (await loadRC(userId)) as {
      getOfferings: () => Promise<{
        current?: {
          availablePackages?: Array<{
            identifier: string;
            product: { priceString: string; title: string; description: string };
          }>;
        };
      }>;
    };
    const offerings = await Purchases.getOfferings();
    return (offerings.current?.availablePackages ?? []).map((pkg) => ({
      productId: pkg.identifier as ProductId,
      displayPrice: pkg.product.priceString,
      title: pkg.product.title,
      description: pkg.product.description,
    }));
  }
  return WEB_CATALOG;
}

/**
 * Purchase a product. Routes through RevenueCat on native; throws on web
 * (web flow uses /checkout?product=<id> for Stripe). RevenueCat
 * automatically acknowledges Google Play purchases and validates receipts
 * server-side, so no extra acknowledgement call is required here.
 */
export async function purchase(productId: ProductId, userId: string): Promise<void> {
  if (!isNative()) {
    throw new Error(
      "purchase() is native-only. On web, navigate to /checkout?product=<id> for Stripe.",
    );
  }
  const Purchases = (await loadRC(userId)) as {
    getOfferings: () => Promise<{
      current?: { availablePackages?: Array<{ identifier: string }> };
    }>;
    purchasePackage: (opts: { aPackage: unknown }) => Promise<void>;
  };
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages?.find((p) => p.identifier === productId);
  if (!pkg) {
    throw new Error(
      `Product ${productId} not available in current ${isIOS() ? "App Store" : "Google Play"} offering`,
    );
  }
  await Purchases.purchasePackage({ aPackage: pkg });
}

/**
 * Restore previous purchases.
 * Required by Apple guideline 3.1.1 and recommended for Google Play.
 */
export async function restorePurchases(userId: string): Promise<{ ok: true } | { error: string }> {
  if (!isNative()) return { ok: true };
  try {
    const Purchases = (await loadRC(userId)) as { restorePurchases: () => Promise<unknown> };
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Restore failed" };
  }
}

/**
 * Read current entitlement state from RevenueCat (native) or return a
 * permissive default on web (where the Stripe-backed `useSubscription`
 * hook remains the source of truth).
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  if (!isNative()) {
    return { premium: false, activePass: false, verificationBadge: false };
  }
  const cfg = await getConfig();
  const Purchases = (await loadRC(userId)) as {
    getCustomerInfo: () => Promise<{
      entitlements: { active: Record<string, { expirationDate?: string | null }> };
      nonSubscriptionTransactions?: Array<{ productIdentifier: string }>;
    }>;
  };
  const info = await Purchases.getCustomerInfo();
  const premiumEnt = info.entitlements.active[cfg.entitlementId];
  const passEnt = info.entitlements.active["active_pass"];
  const ownsBadge = (info.nonSubscriptionTransactions ?? []).some(
    (t) => t.productIdentifier === "verification_badge",
  );
  return {
    premium: !!premiumEnt,
    activePass: !!passEnt,
    activePassUntil: passEnt?.expirationDate ?? null,
    verificationBadge: ownsBadge,
    premiumUntil: premiumEnt?.expirationDate ?? null,
  };
}

/**
 * Open the native "Manage Subscriptions" sheet on iOS / Android, or the
 * Stripe Customer Portal on web. Apple 3.1.2 and Google Play policy both
 * require an in-app affordance to manage auto-renewing subscriptions.
 */
export function getManageSubscriptionUrl(): string {
  if (isIOS()) return "itms-apps://apps.apple.com/account/subscriptions";
  if (isAndroid()) {
    // Deep link to the Google Play subscription management screen for this app.
    return "https://play.google.com/store/account/subscriptions?package=best.unveil.app";
  }
  return "/manage-subscription";
}

/** Static fallback for web — the canonical web catalog lives in /premium and /checkout. */
const WEB_CATALOG: PurchaseOffer[] = [
  { productId: "pass_24h", displayPrice: "$1.99", title: "Daily Pass", description: "Unlimited messaging for 24 hours" },
  { productId: "pass_2w", displayPrice: "$9.99", title: "Two-Week Unlimited Pass", description: "Unlimited messaging for 14 days" },
  { productId: "premium_monthly", displayPrice: "$15.99", title: "Premium Monthly", description: "Auto-renews monthly" },
  { productId: "premium_quarterly", displayPrice: "$39.99", title: "Premium 3 Months", description: "Save 17% vs monthly" },
  { productId: "premium_annual", displayPrice: "$149.99", title: "Premium Annual", description: "Auto-renews yearly" },
  { productId: "verification_badge", displayPrice: "$9.99", title: "Verification Badge", description: "One-time identity verification fee" },
];
