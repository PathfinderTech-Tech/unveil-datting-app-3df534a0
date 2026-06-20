import { ChevronLeft } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";

/**
 * Universal back button rendered globally on every secondary screen.
 *
 * Hidden on:
 *  - the landing page (/)
 *  - tab-root destinations reachable from the mobile bottom nav / desktop nav
 *  - auth screens (login/signup/reset/onboarding) — those have their own flow
 *  - chat & match detail — those screens render their own in-header back control
 *
 * Uses router.history.back() with a safe `/` fallback so deep links still
 * return somewhere sensible. Triggers a short haptic on supporting devices.
 */
const HIDE_ON = new Set<string>([
  "/",
  "/discover",
  "/messages",
  "/matches",
  "/insights-ai",
  "/profile",
  "/passport",
  "/gifts",
  "/login",
  "/signup",
  "/onboarding",
  "/reset-password",
]);

const HIDE_PREFIXES = ["/chat", "/match/", "/auth"];

export function GlobalBackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (HIDE_ON.has(pathname)) return null;
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const onClick = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as Navigator & { vibrate?: (n: number) => boolean }).vibrate?.(8); } catch { /* noop */ }
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="fixed left-3 z-[60] inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.7)] px-3 py-1.5 text-[13px] font-medium text-foreground/90 shadow-[0_4px_18px_-8px_oklch(0.1_0.04_298/0.6)] backdrop-blur-xl transition-all hover:bg-[oklch(0.18_0.07_298/0.85)] hover:text-foreground active:scale-95 sm:left-4"
      style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Back</span>
    </button>
  );
}
