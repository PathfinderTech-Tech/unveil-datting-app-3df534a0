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
  appId: "tech.pathfinder.unveil",
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
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#09070d",
      showSpinner: false,
      androidSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
  // The app is a TanStack Start SSR app on Cloudflare — it cannot be
  // rendered from a static bundle. Point the native WebView at the hosted
  // site so navigation stays INSIDE MainActivity / WKWebView. Without
  // server.url the packaged public/index.html would run and any top-level
  // navigation to unveil.best gets handed off to Chrome/Safari, breaking
  // the native shell (this was the App Store / Play Store rejection cause).
  server: {
    url: process.env.CAPACITOR_LIVE_URL ?? "https://unveil.best",
    allowNavigation: [
      "unveil.best",
      "www.unveil.best",
      "*.unveil.best",
      "*.supabase.co",
    ],
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
};

export default config;
