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
import { CooldownGuard } from "@/components/CooldownGuard";
import { useRevealNotifications } from "@/hooks/use-reveal-notifications";
import logoAsset from "@/assets/unveil-logo-v2.png.asset.json";
import watermarkAsset from "@/assets/unveil-watermark.png.asset.json";

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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { title: "UNVEIL — Connection Starts Beneath the Surface" },
      { name: "description", content: "Compatibility-first dating platform where meaningful connections form before appearance becomes central." },
      { name: "author", content: "UNVEIL" },
      { name: "theme-color", content: "#0F172A" },
      { property: "og:site_name", content: "UNVEIL" },
      { property: "og:title", content: "UNVEIL — Connection Starts Beneath the Surface" },
      { property: "og:description", content: "Compatibility-first dating platform where meaningful connections form before appearance becomes central." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: logoAsset.url },
      { name: "twitter:title", content: "UNVEIL — Connection Starts Beneath the Surface" },
      { name: "twitter:description", content: "Compatibility-first dating platform where meaningful connections form before appearance becomes central." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoAsset.url },
      { rel: "apple-touch-icon", href: logoAsset.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
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
      {/* Global fading watermark behind all content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(13,13,15,0) 0%, rgba(13,13,15,0.55) 55%, rgba(13,13,15,0.95) 100%), url(${watermarkAsset.url})`,
          backgroundSize: "cover, min(80vmin, 900px) min(80vmin, 900px)",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat, no-repeat",
          opacity: 0.18,
          mixBlendMode: "screen",
          animation: "unveil-watermark-pulse 14s ease-in-out infinite",
        }}
      />
      <div className="relative z-10 flex min-h-screen flex-col pb-16 lg:pb-0">
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
        <MobileBottomNav />
      </div>
    </QueryClientProvider>
  );
}

function RevealNotifier() {
  // Subscribes to reveal_progress and toasts on newly available stages.
  useRevealNotifications();
  return null;
}
