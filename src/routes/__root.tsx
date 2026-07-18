import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import "@/i18n";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeTokenSwitcher } from "@/components/ThemeTokenSwitcher";
import { CooldownGuard } from "@/components/CooldownGuard";
import { PresenceProvider } from "@/hooks/use-presence";
import { useAppLifecycle } from "@/hooks/use-app-lifecycle";

import logoMarkUrl from "@/assets/unveil-logo-mark.svg";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { GlobalBackButton } from "@/components/GlobalBackButton";
import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    __UNVEIL_STARTUP_ERRORS__?: unknown[];
  }
}

const STARTUP_FALLBACK_SCRIPT = `
(function () {
  var errors = [];
  window.__UNVEIL_STARTUP_ERRORS__ = errors;

  function asText(value) {
    if (!value) return "Unknown startup error";
    if (typeof value === "string") return value;
    if (value.message) return value.message;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }

  function showFallback(reason) {
    if (document.documentElement.getAttribute("data-unveil-ready") === "1") return;
    if (!document.body || document.getElementById("unveil-startup-fallback")) return;
    var panel = document.createElement("div");
    panel.id = "unveil-startup-fallback";
    panel.setAttribute("role", "alert");
    panel.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#09070d;color:#f8f4ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;";
    panel.innerHTML = '<div style="max-width:420px;width:100%;text-align:center;border:1px solid rgba(216,180,254,.35);border-radius:28px;background:rgba(24,16,32,.96);padding:32px;box-shadow:0 0 80px rgba(168,85,247,.24)"><div style="font-size:28px;letter-spacing:.28em;margin-bottom:14px">UNVEIL</div><h1 style="font-size:20px;margin:0 0 10px">UNVEIL could not finish opening</h1><p style="margin:0;color:rgba(248,244,255,.72);line-height:1.5">' + asText(reason).replace(/[<>&]/g, function (c) { return ({"<":"&lt;",">":"&gt;","&":"&amp;"})[c]; }) + '</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px"><button type="button" onclick="window.location.reload()" style="border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#8b5cf6,#ec4899,#f59e0b);color:white;font-weight:700">Retry</button><button type="button" onclick="window.location.href=\'/\'" style="border:1px solid rgba(216,180,254,.35);border-radius:999px;padding:12px 18px;background:rgba(255,255,255,.06);color:#f8f4ff;font-weight:700">Home</button></div></div>';
    document.body.appendChild(panel);
  }

  window.addEventListener("error", function (event) {
    var target = event.target;
    var asset = target && target !== window ? (target.src || target.href || target.currentSrc) : "";
    var entry = { type: "error", message: event.message || asset || "Asset failed to load", source: event.filename || asset || "unknown", at: Date.now() };
    errors.push(entry);
    if ((target && target.tagName === "SCRIPT") || event.error) showFallback(entry.message);
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var entry = { type: "unhandledrejection", message: asText(event.reason), at: Date.now() };
    errors.push(entry);
    showFallback(entry.message);
  });

  window.setTimeout(function () {
    if (document.documentElement.getAttribute("data-unveil-ready") !== "1") {
      showFallback("Startup took longer than expected. Please retry.");
    }
  }, 12000);
})();
`;

function devErrorCode(error: Error) {
  return `${error.name || "Error"}:${error.message || "unknown"}`;
}

function clearSessionAndRestart(reset?: () => void) {
  try {
    window.sessionStorage.clear();
    window.localStorage.removeItem("unveil-tile-match-progress-v1");
    window.localStorage.removeItem("unveil-discover-v1");
  } catch {
    /* noop */
  }

  if (reset) {
    reset();
  }

  window.location.assign("/");
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[route:error]", error);
  }, [error]);

  return (
    <RouteRecoveryScreen
      title="This route hit an error"
      message="UNVEIL recovered safely. Use navigation below to continue while this page reloads."
      primaryAction={
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
        >
          Retry this route
        </button>
      }
      devCode={devErrorCode(error)}
    />
  );
}

function FatalAppScreen({
  title,
  message,
  primaryAction,
  secondaryAction,
  devCode,
}: {
  title: string;
  message: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  devCode?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09070d] px-4 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-primary/20 bg-card/95 p-8 text-center shadow-glow backdrop-blur">
        <img src={logoMarkUrl} alt="UNVEIL" className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
        {import.meta.env.DEV && devCode && (
          <div className="mt-4 rounded-2xl border border-border bg-background/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {devCode}
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchOverlay({ timedOut }: { timedOut: boolean }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09070d] px-6 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-primary/20 bg-card/95 p-8 text-center shadow-glow backdrop-blur">
        <img src={logoMarkUrl} alt="UNVEIL" className="mx-auto h-20 w-20 rounded-[1.75rem] shadow-glow" />
        <h1 className="mt-5 font-display text-3xl font-light">UNVEIL</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {timedOut ? "UNVEIL is taking longer than expected to open." : "Preparing your experience…"}
        </p>
        <div className="mt-6 flex justify-center">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-300 ${timedOut ? "w-full" : "animate-[pulse_1.4s_ease-in-out_infinite] w-2/3"}`} />
          </div>
        </div>
        {timedOut && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function useLaunchState() {
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let active = true;
    const markReady = () => {
      if (!active) return;
      setReady(true);
      setTimedOut(false);
    };

    const minimumDelay = window.setTimeout(markReady, 900);

    const timeout = window.setTimeout(() => {
      if (!active) return;
      setTimedOut(true);
    }, 8000);

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* noop */
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(minimumDelay);
      window.clearTimeout(timeout);
    };
  }, []);

  return {
    showOverlay: !ready,
    timedOut,
  };
}

function AppRuntimeGuard({ children }: { children: React.ReactNode }) {
  const [fatalError, setFatalError] = useState<unknown | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-unveil-ready", "1");
    console.info("[startup:ready]", {
      route: window.location.pathname,
      userAgent: window.navigator.userAgent,
      storedStartupErrors: window.__UNVEIL_STARTUP_ERRORS__?.length ?? 0,
    });

    const onError = (event: ErrorEvent) => {
      console.error("[runtime:error]", {
        route: window.location.pathname,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error ?? event.message,
      });
      if (event.error) setFatalError(event.error);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[runtime:unhandledrejection]", {
        route: window.location.pathname,
        reason: event.reason,
      });
      setFatalError(event.reason ?? new Error("Unhandled startup rejection"));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (fatalError) {
    const error = fatalError instanceof Error ? fatalError : new Error(String(fatalError));
    return (
      <FatalAppScreen
        title="UNVEIL recovered from a startup error"
        message="The app did not open cleanly, so this safety screen is shown instead of a blank page. Retry or return home."
        primaryAction={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
          >
            Retry
          </button>
        }
        secondaryAction={
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Home
          </a>
        }
        devCode={devErrorCode(error)}
      />
    );
  }

  return <>{children}</>;
}

function RouteRecoveryScreen({
  title,
  message,
  primaryAction,
  devCode,
}: {
  title: string;
  message: string;
  primaryAction: React.ReactNode;
  devCode?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09070d] px-4 text-foreground">
      <div className="w-full max-w-xl rounded-3xl border border-primary/20 bg-card/95 p-8 text-center shadow-glow backdrop-blur">
        <img src={logoMarkUrl} alt="UNVEIL" className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {primaryAction}
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Home
          </a>
          <a
            href="/discover"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Discover
          </a>
          <a
            href="/matches"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Matches
          </a>
          <a
            href="/messages"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Messages
          </a>
          <a
            href="/profile"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Profile
          </a>
          <button
            type="button"
            onClick={() => clearSessionAndRestart()}
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Clear Session
          </button>
        </div>
        {import.meta.env.DEV && devCode && (
          <div className="mt-4 rounded-2xl border border-border bg-background/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {devCode}
          </div>
        )}
      </div>
    </div>
  );
}

function AppBootLayer() {
  // Hide native splash on mount for Capacitor builds; no web overlay.
  useEffect(() => {
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch { /* noop */ }
    })();
  }, []);
  return null;
}

function AppChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useAppLifecycle();

  const isLanding = pathname === "/";
  const variant: "center" | "corner" | "edge" = isLanding ? "center" : "corner";
  const opacity = isLanding ? 0.008 : 0.005;
  const isChromeless = pathname.startsWith("/chat") || pathname.startsWith("/match/");

  return (
    <>
      <CooldownGuard />
      <VeilBackdrop variant={variant} opacity={opacity} />
      {!isChromeless && <GlobalBackButton />}
      <div className={`relative z-10 flex min-h-[100dvh] flex-col ${isChromeless ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"}`}>
        <div className="flex-1">
          <Outlet />
        </div>
        {!isChromeless && <SiteFooter />}
        {!isChromeless && <MobileBottomNav />}
        {import.meta.env.DEV && <ThemeTokenSwitcher />}
      </div>
      <AppBootLayer />
    </>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "UNVEIL" },
      { name: "description", content: "Connection begins beneath the surface." },
      { name: "author", content: "UNVEIL" },
      { name: "theme-color", content: "#09070d" },
      { property: "og:site_name", content: "UNVEIL" },
      { property: "og:title", content: "UNVEIL" },
      { property: "og:description", content: "Connection begins beneath the surface." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://unveil.best" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@unveilbest" },
      { name: "twitter:url", content: "https://unveil.best" },
      { name: "twitter:title", content: "UNVEIL" },
      { name: "twitter:description", content: "Connection begins beneath the surface." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: logoMarkUrl },
      { rel: "apple-touch-icon", href: logoMarkUrl },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Raleway:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&f[]=satoshi@400,500,700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "UNVEIL",
          url: "https://unveil.best",
          logo: `https://unveil.best${logoMarkUrl}`,
          email: "support@unveil.best",
          description: "Compatibility-first dating platform where meaningful connections form before appearance becomes central.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: STARTUP_FALLBACK_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PresenceProvider>
        <AppRuntimeGuard>
          <AppChrome />
        </AppRuntimeGuard>
      </PresenceProvider>
    </QueryClientProvider>
  );
}
