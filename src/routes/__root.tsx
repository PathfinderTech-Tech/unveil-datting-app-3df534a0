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

import logoAsset from "@/assets/unveil-logo-v3.png.asset.json";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { GlobalBackButton } from "@/components/GlobalBackButton";
import { useRouterState } from "@tanstack/react-router";


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
  console.error(error);
  const router = useRouter();

  return (
    <FatalAppScreen
      title="Something went wrong"
      message="Something went wrong. Please restart UNVEIL."
      primaryAction={
        <button
          onClick={() => {
            router.invalidate();
            reset();
            window.location.reload();
          }}
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
          Go home
        </a>
      }
    />
  );
}

function FatalAppScreen({
  title,
  message,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  message: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09070d] px-4 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-primary/20 bg-card/95 p-8 text-center shadow-glow backdrop-blur">
        <img src={logoAsset.url} alt="UNVEIL" className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      </div>
    </div>
  );
}

function LaunchOverlay({ timedOut }: { timedOut: boolean }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09070d] px-6 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-primary/20 bg-card/95 p-8 text-center shadow-glow backdrop-blur">
        <img src={logoAsset.url} alt="UNVEIL" className="mx-auto h-20 w-20 rounded-[1.75rem] shadow-glow" />
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
    let painted = false;
    let minimumDelayDone = false;

    const maybeReady = () => {
      if (!active || !painted || !minimumDelayDone) return;
      setReady(true);
      setTimedOut(false);
    };

    const minimumDelay = window.setTimeout(() => {
      minimumDelayDone = true;
      maybeReady();
    }, 900);

    const timeout = window.setTimeout(() => {
      if (!active) return;
      setTimedOut(true);
    }, 8000);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        painted = true;
        maybeReady();
      });
    });

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
  const [fatalError, setFatalError] = useState<Error | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error(event.error ?? event.message);
      setFatalError(event.error instanceof Error ? event.error : new Error(event.message || "Unexpected runtime error"));
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error(event.reason);
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Unexpected async runtime error";
      setFatalError(event.reason instanceof Error ? event.reason : new Error(message));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (fatalError) {
    return (
      <FatalAppScreen
        title="Something went wrong"
        message="Something went wrong. Please restart UNVEIL."
        primaryAction={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
          >
            Retry
          </button>
        }
      />
    );
  }

  return <>{children}</>;
}

function AppBootLayer() {
  const { showOverlay, timedOut } = useLaunchState();

  if (!showOverlay) return null;
  return <LaunchOverlay timedOut={timedOut} />;
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
      { rel: "icon", type: "image/png", href: logoAsset.url },
      { rel: "apple-touch-icon", href: logoAsset.url },
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
          logo: logoAsset.url,
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
