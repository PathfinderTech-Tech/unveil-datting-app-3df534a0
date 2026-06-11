/**
 * Unified purchases / entitlement layer
 * --------------------------------------
 * Web → existing Stripe Embedded Checkout (createCheckoutSession + Stripe webhook).
 * iOS → RevenueCat SDK (StoreKit under the hood; receipts + restore handled by RC).
 *
 * Entitlements exposed to the rest of the app:
 *   - premium_access
 *   - unlimited_messaging
 *   - active_pass  (24h / 2w consumable / non-renewing window)
 *
 * The RevenueCat SDK is installed dynamically inside `loadRC()` so the web
 * bundle stays free of native-only code. The actual `@revenuecat/purchases-capacitor`
 * package will be installed and wired during the Capacitor build step
 * (see IOS_BUILD.md). Until then, native paths throw a clear error.
 */
import { isIOS } from "./platform";

export type ProductId =
  | "pass_24h"
  | "pass_2w"
  | "premium_monthly"
  | "premium_quarterly"
  | "premium_annual";

export type EntitlementId = "premium_access" | "unlimited_messaging" | "active_pass";

export interface PurchaseOffer {
  productId: ProductId;
  displayPrice: string;
  title: string;
  description: string;
}

export interface Entitlements {
  premium_access: boolean;
  unlimited_messaging: boolean;
  active_pass: boolean;
  /** ISO timestamp when the active pass expires, if any. */
  activePassUntil?: string | null;
}

const RC_PUBLIC_KEY_ENV = (import.meta.env as Record<string, string | undefined>)
  .VITE_REVENUECAT_IOS_PUBLIC_KEY;

let rcReady: Promise<unknown> | null = null;

/**
 * Lazy-load + initialise the RevenueCat Capacitor SDK on iOS.
 * Returns the configured Purchases object.
 *
 * @internal
 */
async function loadRC(userId: string): Promise<unknown> {
  if (!isIOS()) throw new Error("RevenueCat is only available on iOS");
  if (!RC_PUBLIC_KEY_ENV) {
    throw new Error("VITE_REVENUECAT_IOS_PUBLIC_KEY is not configured");
  }
  if (rcReady) return rcReady;
  rcReady = (async () => {
    // Dynamic import keeps the web bundle clean.
    // The package is installed inside the iOS Capacitor build (see IOS_BUILD.md).
    // Use a runtime-computed specifier so TypeScript doesn't try to resolve
    // the module at build time (it isn't installed in the web project).
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
    await mod.Purchases.configure({ apiKey: RC_PUBLIC_KEY_ENV, appUserID: userId });
    return mod.Purchases;
  })();
  return rcReady;
}

/**
 * List purchasable offers for the current platform.
 * Web returns a static catalog (priced cards link out to Stripe Checkout);
 * iOS returns the live App Store offerings.
 */
export async function getOffers(userId: string): Promise<PurchaseOffer[]> {
  if (isIOS()) {
    const Purchases = (await loadRC(userId)) as {
      getOfferings: () => Promise<{ current?: { availablePackages?: Array<{ identifier: string; product: { priceString: string; title: string; description: string } }> } }>;
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
 * Purchase a product. On iOS routes to StoreKit via RevenueCat.
 * On web, callers should use the existing Stripe checkout flow
 * (`createCheckoutSession`) — this function throws a clear error to
 * make the platform contract explicit.
 */
export async function purchase(productId: ProductId, userId: string): Promise<void> {
  if (!isIOS()) {
    throw new Error(
      "purchase() is iOS-only. On web, navigate to /checkout?product=<id> for Stripe."
    );
  }
  const Purchases = (await loadRC(userId)) as {
    getOfferings: () => Promise<{ current?: { availablePackages?: Array<{ identifier: string; rcBillingProduct?: unknown; product: unknown }> } }>;
    purchasePackage: (opts: { aPackage: unknown }) => Promise<void>;
  };
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages?.find((p) => p.identifier === productId);
  if (!pkg) throw new Error(`Product ${productId} not available in current App Store offering`);
  await Purchases.purchasePackage({ aPackage: pkg });
}

/**
 * Restore previous purchases. Required by Apple guideline 3.1.1 for any
 * app that sells non-consumable / auto-renewing IAP.
 * On web, restoration is automatic from the Stripe subscription record —
 * this function is a no-op there but returns success.
 */
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
 * Read current entitlement state. On iOS goes through RevenueCat customer
 * info. On web, callers should rely on the existing subscription/quota
 * hooks (`useMessageQuota`) — this returns a permissive default so UIs
 * that branch on platform don't break.
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  if (!isIOS()) {
    return { premium_access: false, unlimited_messaging: false, active_pass: false };
  }
  const Purchases = (await loadRC(userId)) as {
    getCustomerInfo: () => Promise<{
      entitlements: { active: Record<string, { expirationDate?: string | null }> };
    }>;
  };
  const info = await Purchases.getCustomerInfo();
  const active = info.entitlements.active;
  const passEnt = active["active_pass"];
  return {
    premium_access: !!active["premium_access"],
    unlimited_messaging: !!active["unlimited_messaging"],
    active_pass: !!passEnt,
    activePassUntil: passEnt?.expirationDate ?? null,
  };
}

/** Static fallback for web — the canonical web catalog lives in /premium and /checkout. */
const WEB_CATALOG: PurchaseOffer[] = [
  { productId: "pass_24h", displayPrice: "$1.99", title: "24-Hour Pass", description: "Unlimited messaging for 24 hours" },
  { productId: "pass_2w", displayPrice: "$9.99", title: "2-Week Pass", description: "Unlimited messaging for 14 days" },
  { productId: "premium_monthly", displayPrice: "$15.99", title: "Premium Monthly", description: "Auto-renews monthly" },
  { productId: "premium_quarterly", displayPrice: "$39.99", title: "Premium Quarterly", description: "Auto-renews every 3 months" },
  { productId: "premium_annual", displayPrice: "$149.99", title: "Premium Annual", description: "Auto-renews yearly" },
];
