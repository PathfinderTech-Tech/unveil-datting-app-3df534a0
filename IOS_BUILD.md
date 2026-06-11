# Unveil — iOS / Capacitor Build Guide

This document is the canonical reference for producing a TestFlight build of
Unveil. The web app (TanStack Start) is the single source of truth; the iOS
binary is a Capacitor wrapper around the same SPA, with StoreKit purchases
routed through RevenueCat.

Bundle ID: `best.unveil.app`
App name: `Unveil`

## One-time setup (per machine)

You need: macOS, Xcode 15+, an Apple Developer account, and a RevenueCat
account.

```bash
# Install Capacitor + the iOS platform (already declared in capacitor.config.ts).
bun add @capacitor/core @capacitor/cli @capacitor/ios
bun add @revenuecat/purchases-capacitor

# Generate the iOS Xcode project (creates /ios — commit this folder).
npx cap add ios
```

In Xcode (`npx cap open ios`):
1. Select the `App` target → Signing & Capabilities → set your Team.
2. Capabilities → add **In-App Purchase**.
3. Capabilities → add **Push Notifications** (optional, for future).
4. Capabilities → add **Sign in with Apple** (we use Lovable Cloud's managed
   Apple provider; the iOS capability is required for the system sheet).

## Secrets

The RevenueCat **iOS public SDK key** (`appl_...`) is stored as the
`REVENUECAT_IOS_PUBLIC_KEY` secret in Lovable Cloud and served to the iOS
client at runtime via the `getRevenueCatConfig` server function
(`src/lib/revenuecat-config.functions.ts`). It is never written into the
web bundle or `.env*` files.

Phase 2 (after App Store Connect is linked) will add:

- `REVENUECAT_REST_API_KEY` — server-side reads + admin lookups
- `REVENUECAT_WEBHOOK_AUTH` — Authorization header for the webhook endpoint

## App Store Connect — Products

Create these IAP products under your app in App Store Connect with the
exact identifiers below (RevenueCat reads them via these identifiers):

| Product ID           | Type                        | Reference name          | Price tier   |
| -------------------- | --------------------------- | ----------------------- | ------------ |
| `pass_24h`           | Consumable                  | 24-Hour Pass            | $1.99        |
| `verification_badge` | Non-consumable              | Verification Badge      | $9.99        |
| `premium_monthly`    | Auto-renewing subscription  | Premium Monthly         | $15.99 / mo  |
| `premium_quarterly`  | Auto-renewing subscription  | Premium Quarterly       | $39.99 / 3mo |
| `premium_annual`     | Auto-renewing subscription  | Premium Annual          | $149.99 / yr |

The three auto-renewing subscriptions go into the same **Subscription Group**
(`unveil_premium_group`) so users can upgrade/downgrade without losing access.

## RevenueCat configuration

In the RevenueCat dashboard:

1. Create the iOS app, paste your App Store Connect shared secret.
2. Import the products above. RevenueCat **Product Identifiers** must
   match the App Store IDs exactly.
3. Create one **Entitlement**:
   - `unveil_premium` — attach `premium_monthly`, `premium_quarterly`,
     `premium_annual`. (The 24h pass and verification badge are read
     directly from non-subscription transactions, not via an entitlement.)
4. Create one **Offering** named `default` and add all five packages.
5. **Phase 2:** configure webhooks → `https://unveil.best/api/public/revenuecat/webhook`
   (endpoint shipped once App Store Connect is connected).

## Build commands

```bash
# 1. Web build
bun run build

# 2. Sync into the iOS project
npx cap sync ios

# 3. Open Xcode and archive (Product → Archive → Distribute App → TestFlight)
npx cap open ios
```

## Submission checklist

See `TESTFLIGHT_CHECKLIST.md`.
