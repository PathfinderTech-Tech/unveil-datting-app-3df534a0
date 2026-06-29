import { useEffect } from "react";

/**
 * Fix for the "blank white screen on resume" bug on iOS/Android (Capacitor).
 *
 * iOS aggressively terminates the WKWebView content process when the app is
 * backgrounded for a while (especially after navigating to Maps, Camera,
 * Files, Photos picker, etc.). When the user comes back, the native shell is
 * still alive but the JS context is dead → blank white screen.
 *
 * Strategy:
 *   - Listen for Capacitor App state changes.
 *   - When the app becomes active again AND it has been backgrounded for
 *     more than ~25s, force a hard reload so the WebView re-bootstraps.
 *   - Also listen for `pageshow` with `event.persisted` (bfcache restore on
 *     web) as a safety net.
 */
export function useAppLifecycle() {
  useEffect(() => {
    let backgroundedAt: number | null = null;
    let cleanup: (() => void) | undefined;

    const reload = () => {
      try {
        window.location.reload();
      } catch {
        /* noop */
      }
    };

    const shouldReload = () => {
      if (backgroundedAt == null) return false;
      const elapsed = Date.now() - backgroundedAt;
      return elapsed > 25_000; // 25s threshold
    };

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");

        const stateHandle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            backgroundedAt = Date.now();
            return;
          }
          if (shouldReload()) reload();
          backgroundedAt = null;
        });

        cleanup = () => {
          stateHandle.remove();
        };
      } catch {
        /* Capacitor not available — web build */
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        backgroundedAt = Date.now();
      } else if (document.visibilityState === "visible" && shouldReload()) {
        reload();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reload();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cleanup?.();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
}
