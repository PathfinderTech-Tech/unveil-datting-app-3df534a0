import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "@/i18n";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeTokenSwitcher } from "@/components/ThemeTokenSwitcher";
import { CooldownGuard } from "@/components/CooldownGuard";
import { useRevealNotifications } from "@/hooks/use-reveal-notifications";
import logoAsset from "@/assets/unveil-logo-v2.png.asset.json";
import { VeilBackdrop } from "@/components/VeilBackdrop";
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
    <html lang="en">
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
      <CooldownGuard />
      <RevealNotifier />
      {/* Background watermark removed per design request */}
      <div className="relative z-10 flex min-h-screen flex-col pb-16 lg:pb-0">
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
        <MobileBottomNav />
        {import.meta.env.DEV && <ThemeTokenSwitcher />}
      </div>
    </QueryClientProvider>
  );
}

function RevealNotifier() {
  // Subscribes to reveal_progress and toasts on newly available stages.
  useRevealNotifications();
  return null;
}
