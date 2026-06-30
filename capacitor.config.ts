import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for the Unveil native wrappers (iOS + Android).
 *
 * Build flow:
 *   1. `bun run build`                 — produce SPA bundle in /dist/client
 *   2. `npx cap sync ios`              — copy bundle into ios/App/App/public
 *      `npx cap sync android`          — copy bundle into android/app/src/main/assets/public
 *   3. `npx cap open ios` | `android`  — open Xcode / Android Studio for release
 *
 * Payments:
 *   - Web     → Stripe Embedded Checkout
 *   - iOS     → StoreKit via RevenueCat (see IOS_BUILD.md)
 *   - Android → Google Play Billing v8 via RevenueCat (see ANDROID_BUILD.md)
 */
const config: CapacitorConfig = {
  appId: "best.unveil.app",
  appName: "Unveil",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    backgroundColor: "#09070d",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#09070d",
    // Google Play requires HTTPS for any remote content the WebView loads.
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
