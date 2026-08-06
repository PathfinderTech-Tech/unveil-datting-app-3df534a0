import { useEffect } from "react";

/**
 * Resume / blank-screen recovery on native is owned by
 * `UnveilBridgeViewController` (reload only when the WKWebView process was
 * terminated or a health probe fails, with rate limits).
 *
 * Do NOT hard-reload the SPA from JS after a timed background interval —
 * that races network/auth on resume and was surfacing the false
 * "recovered from a startup error" screen.
 *
 * This hook only covers the web bfcache case (Safari back-forward cache).
 */
export function useAppLifecycle() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      try {
        window.location.reload();
      } catch {
        /* noop */
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
}
