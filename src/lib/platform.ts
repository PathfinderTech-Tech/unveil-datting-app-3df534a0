/**
 * Platform detection for the dual-target build (web + iOS Capacitor wrapper).
 *
 * Safe to call during SSR — falls back to "web" when `window` is absent.
 * Once the Capacitor wrapper is installed, `Capacitor.getPlatform()` returns
 * "ios" / "android" / "web" and we route payments to StoreKit accordingly.
 */
export type Platform = "web" | "ios" | "android";

export function getPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}

export const isNative = (): boolean => getPlatform() !== "web";
export const isIOS = (): boolean => getPlatform() === "ios";
export const isAndroid = (): boolean => getPlatform() === "android";

/**
 * Apple App Store guideline 3.1.1 forbids linking out to external payment
 * pages from inside the iOS app. Use this flag to swap any "Manage billing"
 * link for the native StoreKit "Manage Subscriptions" deep-link.
 */
export const externalPaymentLinksAllowed = (): boolean => !isIOS();
