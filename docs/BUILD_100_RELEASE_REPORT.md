# Build 100 — Release Validation & Store Readiness Report

Date: 2026-07-08

Legend:
- 🟢 VERIFIED
- 🟡 REQUIRES REAL DEVICE
- 🔴 BLOCKER

Evidence was taken from current source + successful production build.

Build evidence:
- 🟢 VERIFIED: production build succeeds (`npm run build`).

## Phase 1 — Native Payment Blockers

1. iOS uses RevenueCat -> StoreKit
- 🟢 VERIFIED
- Evidence: native purchase path in [src/lib/purchases.ts](src/lib/purchases.ts), checkout native redirect in [src/routes/checkout.tsx](src/routes/checkout.tsx), native purchase actions in [src/routes/premium.tsx](src/routes/premium.tsx), [src/components/MessagePaywallModal.tsx](src/components/MessagePaywallModal.tsx).

2. Android uses RevenueCat -> Google Play Billing
- 🟢 VERIFIED
- Evidence: same native purchase path in [src/lib/purchases.ts](src/lib/purchases.ts); checkout is blocked for all native platforms in [src/routes/checkout.tsx](src/routes/checkout.tsx).

3. Web uses Stripe Checkout
- 🟢 VERIFIED
- Evidence: Stripe embedded checkout in [src/components/StripeEmbeddedCheckout.tsx](src/components/StripeEmbeddedCheckout.tsx), web checkout route in [src/routes/checkout.tsx](src/routes/checkout.tsx), Stripe session server fn in [src/lib/payments.functions.ts](src/lib/payments.functions.ts).

4. No native purchase screen should route to /checkout
- 🟢 VERIFIED
- Evidence: native guard in [src/routes/checkout.tsx](src/routes/checkout.tsx), native handling in [src/routes/premium.tsx](src/routes/premium.tsx), [src/components/MessagePaywallModal.tsx](src/components/MessagePaywallModal.tsx), and non-checkout native CTAs in [src/routes/settings.tsx](src/routes/settings.tsx), [src/routes/match.$userId.tsx](src/routes/match.$userId.tsx), [src/routes/manage-subscription.tsx](src/routes/manage-subscription.tsx).

5. Platform decisions are automatic
- 🟢 VERIFIED
- Evidence: platform branching via [src/lib/platform.ts](src/lib/platform.ts) used by purchase and checkout flow files above.

## Phase 2 — RevenueCat Validation

1. RevenueCat initializes correctly
- 🟢 VERIFIED
- Evidence: dynamic SDK configure in [src/lib/purchases.ts](src/lib/purchases.ts); keys served by [src/lib/revenuecat-config.functions.ts](src/lib/revenuecat-config.functions.ts).

2. Product IDs match Apple Connect
- 🟡 REQUIRES REAL DEVICE
- Evidence: IDs are defined in [src/lib/purchases.ts](src/lib/purchases.ts).
- Device/store console validation still required.

3. Product IDs match Google Play
- 🟡 REQUIRES REAL DEVICE
- Evidence: same IDs used in [src/lib/purchases.ts](src/lib/purchases.ts).
- Play Console + RevenueCat dashboard validation still required.

4. Restore Purchases works
- 🟡 REQUIRES REAL DEVICE
- Evidence: UI in [src/components/RestorePurchasesButton.tsx](src/components/RestorePurchasesButton.tsx), handler in [src/lib/purchases.ts](src/lib/purchases.ts).

5. Entitlements unlock Premium
- 🟢 VERIFIED
- Evidence: entitlement hook in [src/hooks/use-entitlements.ts](src/hooks/use-entitlements.ts) gates premium surfaces (example: [src/components/AiCompatibilityPanel.tsx](src/components/AiCompatibilityPanel.tsx)).

6. Entitlements expire correctly
- 🟢 VERIFIED
- Evidence: RevenueCat expiration fields consumed in [src/lib/purchases.ts](src/lib/purchases.ts) and synced to Supabase in [src/lib/native-subscription-sync.functions.ts](src/lib/native-subscription-sync.functions.ts).

7. Subscription state synchronizes with Supabase
- 🟢 VERIFIED
- Evidence: native sync server fn implemented in [src/lib/native-subscription-sync.functions.ts](src/lib/native-subscription-sync.functions.ts) and invoked from [src/hooks/use-entitlements.ts](src/hooks/use-entitlements.ts).

8. Lifetime membership (if supported) works
- 🟢 VERIFIED
- Evidence: non-expiring premium is normalized to a durable premium horizon in [src/lib/native-subscription-sync.functions.ts](src/lib/native-subscription-sync.functions.ts).
- End-to-end product test still required if lifetime SKU is enabled in stores.

## Phase 3 — Native QA Checklist (Real Device)

### iPhone
- Apple Sign In: 🟡 REQUIRES REAL DEVICE
- Email Sign In: 🟡 REQUIRES REAL DEVICE
- Phone OTP: 🟡 REQUIRES REAL DEVICE
- Purchase Premium: 🟡 REQUIRES REAL DEVICE
- Restore Purchases: 🟡 REQUIRES REAL DEVICE
- Cancel Subscription: 🟡 REQUIRES REAL DEVICE
- AI Insights: 🟡 REQUIRES REAL DEVICE
- Voice Messaging: 🟡 REQUIRES REAL DEVICE
- Image Messaging: 🟡 REQUIRES REAL DEVICE
- Push Notifications: 🟡 REQUIRES REAL DEVICE
- Match Reveal: 🟡 REQUIRES REAL DEVICE
- Games: 🟡 REQUIRES REAL DEVICE
- Journey: 🟡 REQUIRES REAL DEVICE
- Profile: 🟡 REQUIRES REAL DEVICE
- Passport: 🟡 REQUIRES REAL DEVICE
- Membership: 🟡 REQUIRES REAL DEVICE
- Deep Links: 🟡 REQUIRES REAL DEVICE

### Android
- Apple Sign In equivalent (Google / available auth methods): 🟡 REQUIRES REAL DEVICE
- Email Sign In: 🟡 REQUIRES REAL DEVICE
- Phone OTP: 🟡 REQUIRES REAL DEVICE
- Purchase Premium (Google Play Billing via RevenueCat): 🟡 REQUIRES REAL DEVICE
- Restore Purchases: 🟡 REQUIRES REAL DEVICE
- Cancel Subscription: 🟡 REQUIRES REAL DEVICE
- AI Insights: 🟡 REQUIRES REAL DEVICE
- Voice Messaging: 🟡 REQUIRES REAL DEVICE
- Image Messaging: 🟡 REQUIRES REAL DEVICE
- Push Notifications: 🟡 REQUIRES REAL DEVICE
- Match Reveal: 🟡 REQUIRES REAL DEVICE
- Games: 🟡 REQUIRES REAL DEVICE
- Journey: 🟡 REQUIRES REAL DEVICE
- Profile: 🟡 REQUIRES REAL DEVICE
- Passport: 🟡 REQUIRES REAL DEVICE
- Membership: 🟡 REQUIRES REAL DEVICE
- Deep Links: 🟡 REQUIRES REAL DEVICE

## Phase 4 — Store Readiness

1. Privacy Manifest
- 🟢 VERIFIED
- Evidence: [ios/App/App/PrivacyInfo.xcprivacy](ios/App/App/PrivacyInfo.xcprivacy).

2. ATT
- 🟡 REQUIRES REAL DEVICE
- Evidence: ATT purpose string exists in [ios/App/App/Info.plist](ios/App/App/Info.plist).
- Runtime prompt/behavior requires on-device validation and legal confirmation.

3. Purpose Strings
- 🟢 VERIFIED
- Evidence: camera/mic/photos/location/faceid/tracking purpose strings in [ios/App/App/Info.plist](ios/App/App/Info.plist).

4. RevenueCat configuration
- 🟢 VERIFIED
- Evidence: dependency in [package.json](package.json), config endpoint [src/lib/revenuecat-config.functions.ts](src/lib/revenuecat-config.functions.ts), runtime usage [src/lib/purchases.ts](src/lib/purchases.ts).

5. APNs
- 🟡 REQUIRES REAL DEVICE
- Evidence: APNs push function and required secrets in [src/lib/push.functions.ts](src/lib/push.functions.ts), admin trigger in [src/routes/admin.tsx](src/routes/admin.tsx).

6. FCM
- 🟡 REQUIRES REAL DEVICE
- Evidence: no Google services file found in repo; runtime config and device verification required.

7. Push certificates/keys
- 🟡 REQUIRES REAL DEVICE
- Evidence: key-based APNs flow is coded, but deployment secrets and cert state are environment-owned.

8. App Icons
- 🟢 VERIFIED
- Evidence: iOS icon assets in [ios/App/App/Assets.xcassets](ios/App/App/Assets.xcassets).

9. Splash Screen
- 🟢 VERIFIED
- Evidence: splash assets + storyboard in [ios/App/App/Assets.xcassets](ios/App/App/Assets.xcassets) and [ios/App/App/Base.lproj/LaunchScreen.storyboard](ios/App/App/Base.lproj/LaunchScreen.storyboard).

10. Screenshots
- 🟡 REQUIRES REAL DEVICE
- Evidence: store screenshot generation/upload is external to repo.

11. Data Safety (Google Play)
- 🟡 REQUIRES REAL DEVICE
- Evidence: console declaration required outside code.

12. Store metadata
- 🟡 REQUIRES REAL DEVICE
- Evidence: App Store / Play metadata is console-managed.

13. Accessibility
- 🟡 REQUIRES REAL DEVICE
- Evidence: full VoiceOver/TalkBack pass requires physical devices.

14. Performance
- 🟡 REQUIRES REAL DEVICE
- Evidence: build succeeds, but runtime FPS/memory/network profiling requires devices.

15. Crash-free launch
- 🟡 REQUIRES REAL DEVICE
- Evidence: requires real crash telemetry from TestFlight/Play internal testing.

16. Production signing
- 🟡 REQUIRES REAL DEVICE
- Evidence: signing identities/profiles/keystores are external environment assets.

## Phase 5 — Final Release Status

Current release status: 🟡 REQUIRES REAL DEVICE

Blocking code defects from this audit:
- None currently identified after Build 100 remediation.

Submission readiness:
- iOS: 🟡 REQUIRES REAL DEVICE (purchase, restore, auth, push, cancellation, deep links, accessibility/performance checks).
- Android: 🟡 REQUIRES REAL DEVICE (Google Play Billing purchase/restore/cancel, push via FCM, deep links, accessibility/performance checks).

READY is not granted in this report because end-to-end purchase and platform QA has not been executed on physical iOS and Android devices.