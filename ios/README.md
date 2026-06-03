# UNVEIL — iOS (Capacitor) wrapper

This folder is generated on a Mac with Xcode. The Lovable web sandbox
cannot run `npx cap add ios` — that step requires macOS + Xcode +
CocoaPods. Follow the steps below on your Mac.

## Identity

| Field | Value |
|---|---|
| App name | UNVEIL |
| Bundle ID | `best.unveil.app` |
| Operator | PathfinderTech, Inc. |
| Web dir | `dist/` (built by `bun run build`) |
| Config | `capacitor.config.ts` (project root) |

If you need a different bundle ID (e.g. `com.pathfindertech.unveil`),
change `appId` in `capacitor.config.ts` BEFORE running `cap add ios`.

## One-time setup on Mac

```bash
# 1. Install deps
bun install

# 2. Build the web app
bun run build

# 3. Add the iOS native project (creates ios/App)
npx cap add ios

# 4. Copy web build + sync plugins into the iOS project
npx cap sync ios

# 5. Open Xcode
npx cap open ios
```

## Xcode configuration

In `App` target → **Signing & Capabilities**:

1. **Team**: select your Apple Developer team.
2. **Bundle Identifier**: confirm `best.unveil.app`.
3. **+ Capability → Sign in with Apple**.
4. **+ Capability → Push Notifications**.
5. **+ Capability → Background Modes** → check
   _Remote notifications_.

In `App` target → **General**:

- **Display Name**: UNVEIL
- **Version**: `1.0.0`
- **Build**: `1` (increment on every TestFlight upload)
- **Deployment Target**: iOS 14.0 or higher

Add to `ios/App/App/Info.plist` (Xcode → Info tab) usage strings:

- `NSCameraUsageDescription` — "UNVEIL uses your camera to add profile photos and record voice intros."
- `NSMicrophoneUsageDescription` — "UNVEIL uses your microphone to record voice introductions."
- `NSPhotoLibraryUsageDescription` — "UNVEIL needs access to your photos to upload profile pictures."
- `NSPhotoLibraryAddUsageDescription` — "UNVEIL can save shared images to your photo library."
- `NSLocationWhenInUseUsageDescription` — "UNVEIL uses your approximate location to find nearby matches."
- `NSUserTrackingUsageDescription` — "Used only to keep you signed in across app launches."

## Build & ship to TestFlight

```bash
# Every time the web app changes:
bun run build && npx cap sync ios

# In Xcode:
# Product → Destination → Any iOS Device (arm64)
# Product → Archive
# Organizer → Distribute App → App Store Connect → Upload
```

Then in App Store Connect → TestFlight → add internal testers.

## App Store metadata (already live)

| Required URL | Path |
|---|---|
| Privacy Policy | https://unveil.best/privacy |
| Terms of Service | https://unveil.best/terms |
| Community Guidelines | https://unveil.best/community-guidelines |
| Refund Policy | https://unveil.best/refund |
| Support URL | https://unveil.best/support |
| Marketing URL | https://unveil.best |
| Support email | support@unveil.best |

## Push notifications

The `@capacitor/push-notifications` plugin is installed.
Wire-up code lives in `src/hooks/use-push-notifications.ts` (web no-op,
runs only inside Capacitor). Tokens are stored in the Supabase
`device_tokens` table (to be created with a follow-up migration when
you're ready to send pushes via APNs).

## Apple Sign In

Already wired in the web app via Lovable Cloud auth
(`supabase.auth.signInWithOAuth({ provider: 'apple' })`). The Capacitor
shell will use the same flow. To get the native sheet, add the
`@capacitor-community/apple-sign-in` plugin later — not required for
TestFlight submission.
