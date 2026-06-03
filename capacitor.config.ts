import type { CapacitorConfig } from "@capacitor/cli";

// UNVEIL — iOS Capacitor wrapper
// Bundle ID:  best.unveil.app
// Operated by: PathfinderTech, Inc.
const config: CapacitorConfig = {
  appId: "best.unveil.app",
  appName: "UNVEIL",
  webDir: "dist",
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0b0b0f",
    scheme: "UNVEIL",
  },
  server: {
    // Production: ship the bundled web build inside the IPA (no server.url).
    // For live-reload during development on a real device, uncomment and point
    // to the Lovable preview URL, then run `npx cap sync ios`.
    // url: "https://id-preview--4ea519e3-d640-46a7-8d58-fe8fd35d987d.lovable.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "unveil.best",
      "*.unveil.best",
      "*.lovable.app",
      "*.supabase.co",
      "appleid.apple.com",
      "accounts.google.com",
      "*.stripe.com",
      "checkout.stripe.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b0b0f",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
