/**
 * Unified purchases / entitlement layer
 * --------------------------------------
 * Web → existing Stripe Embedded Checkout (createCheckoutSession + Stripe webhook).
 * iOS → RevenueCat SDK (StoreKit under the hood; receipts + restore handled by RC).
 *
 * Entitlement (single source of truth on iOS): `unveil_premium`
 *
 * Products (App Store Connect IDs match RevenueCat product IDs):
 *   - premium_monthly      (auto-renewing subscription)
 *   - premium_quarterly    (auto-renewing subscription)
 *   - premium_annual       (auto-renewing subscription)
 *   - pass_24h             (consumable — 24h unlimited messaging pass)
 *   - verification_badge   (non-consumable — one-time verification fee)
 *
 * The RevenueCat SDK is loaded dynamically inside `loadRC()` so the web
 * bundle stays free of native-only code. The actual
 * `@revenuecat/purchases-capacitor` package is installed during the
 * Capacitor build step (see IOS_BUILD.md).
 */
import { isIOS } from "./platform";
import { getRevenueCatConfig } from "./revenuecat-config.functions";

export type ProductId =
  | "premium_monthly"
  | "premium_quarterly"
  | "premium_annual"
  | "pass_24h"
  | "verification_badge";

export const PREMIUM_ENTITLEMENT_ID = "unveil_premium" as const;

export interface PurchaseOffer {
  productId: ProductId;
  displayPrice: string;
  title: string;
  description: string;
}

export interface Entitlements {
  /** True if the user has the "unveil_premium" entitlement (any premium plan or active pass). */
  premium: boolean;
  /** True if a 24h messaging pass is currently active. */
  activePass: boolean;
  /** True if the user owns the verification badge. */
  verificationBadge: boolean;
  /** ISO timestamp when the premium entitlement expires, if known. */
  premiumUntil?: string | null;
}

interface RCConfig {
  iosPublicKey: string | null;
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
 * Lazy-load + initialise the RevenueCat Capacitor SDK on iOS.
 * @internal
 */
async function loadRC(userId: string): Promise<unknown> {
  if (!isIOS()) throw new Error("RevenueCat is only available on iOS");
  const cfg = await getConfig();
  if (!cfg.iosPublicKey) {
    throw new Error("RevenueCat iOS public key not configured on server");
  }
  if (rcReady) return rcReady;
  rcReady = (async () => {
    // Runtime-computed specifier so the web build doesn't try to resolve it.
    const specifier = "@revenuecat/purchases-capacitor";
    const mod = (await import(/* @vite-ignore */ specifier).catch(() => null)) as null | {
      Purchases: {
        configure: (opts: { apiKey: string; appUserID: string }) => Promise<void>;
      };
    };
    if (!mod) {
      throw new Error(
        "RevenueCat SDK not bundled. Run `bun add @revenuecat/purchases-capacitor` in the iOS build."
      );
    }
    await mod.Purchases.configure({ apiKey: cfg.iosPublicKey!, appUserID: userId });
    return mod.Purchases;
  })();
  return rcReady;
}

/**
 * List purchasable offers for the current platform.
 * Web returns the static catalog (cards link out to Stripe Checkout).
 * iOS returns the live App Store offerings via RevenueCat.
 */
export async function getOffers(userId: string): Promise<PurchaseOffer[]> {
  if (isIOS()) {
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

/** Purchase a product. iOS → StoreKit via RevenueCat. Web throws. */
export async function purchase(productId: ProductId, userId: string): Promise<void> {
  if (!isIOS()) {
    throw new Error(
      "purchase() is iOS-only. On web, navigate to /checkout?product=<id> for Stripe."
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
  if (!pkg) throw new Error(`Product ${productId} not available in current App Store offering`);
  await Purchases.purchasePackage({ aPackage: pkg });
}

/** Restore previous purchases. Required by Apple guideline 3.1.1. */
export async function restorePurchases(userId: string): Promise<{ ok: true } | { error: string }> {
  if (!isIOS()) return { ok: true };
  try {
    const Purchases = (await loadRC(userId)) as { restorePurchases: () => Promise<unknown> };
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Restore failed" };
  }
}

/**
 * Read current entitlement state from RevenueCat (iOS) or return a
 * permissive default on web (where the Stripe-backed `useSubscription`
 * hook remains the source of truth).
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  if (!isIOS()) {
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
    (t) => t.productIdentifier === "verification_badge"
  );
  return {
    premium: !!premiumEnt,
    activePass: !!passEnt,
    verificationBadge: ownsBadge,
    premiumUntil: premiumEnt?.expirationDate ?? null,
  };
}

/**
 * Open Apple's native "Manage Subscriptions" sheet (iOS) or the Stripe
 * Customer Portal (web). Apple guideline 3.1.2 requires a manage-subs
 * affordance from inside the app for auto-renewable subscriptions.
 */
export function getManageSubscriptionUrl(): string {
  if (isIOS()) return "itms-apps://apps.apple.com/account/subscriptions";
  return "/manage-subscription";
}

/** Static fallback for web — the canonical web catalog lives in /premium and /checkout. */
const WEB_CATALOG: PurchaseOffer[] = [
  { productId: "pass_24h", displayPrice: "$1.99", title: "24-Hour Pass", description: "Unlimited messaging for 24 hours" },
  { productId: "premium_monthly", displayPrice: "$15.99", title: "Premium Monthly", description: "Auto-renews monthly" },
  { productId: "premium_quarterly", displayPrice: "$39.99", title: "Premium Quarterly", description: "Auto-renews every 3 months" },
  { productId: "premium_annual", displayPrice: "$149.99", title: "Premium Annual", description: "Auto-renews yearly" },
  { productId: "verification_badge", displayPrice: "$9.99", title: "Verification Badge", description: "One-time identity verification fee" },
];
