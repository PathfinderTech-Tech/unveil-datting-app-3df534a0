import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for the Unveil iOS wrapper.
 *
 * Build flow:
 *   1. `bun run build`               — produce SPA bundle in /dist
 *   2. `npx cap sync ios`            — copy bundle into ios/App/App/public
 *   3. `npx cap open ios`            — opens Xcode for archive + TestFlight
 *
 * The web build remains the source of truth. iOS swaps Stripe checkout for
 * StoreKit via RevenueCat (see src/lib/purchases.ts and IOS_BUILD.md).
 */
const config: CapacitorConfig = {
  appId: "best.unveil.app",
  appName: "Unveil",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    backgroundColor: "#09070d",
    // Allow only HTTPS at runtime (we never load mixed content).
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    // During TestFlight we ship the bundled SPA. To point a build at the
    // live production site for QA, set `url: "https://unveil.best"` and run
    // `npx cap sync ios` again.
    androidScheme: "https",
  },
};

export default config;
