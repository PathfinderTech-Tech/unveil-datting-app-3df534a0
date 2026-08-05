/**
 * Baseline HTTP security headers for UNVEIL (Cloudflare Worker / TanStack Start).
 * Applied to every response from src/server.ts.
 *
 * CSP is intentionally pragmatic: Stripe, Supabase, Google Fonts, Fontshare,
 * and Vite/SSR inline scripts/styles must remain allowed for the app to work.
 *
 * Important: do NOT send `upgrade-insecure-requests` on http:// (localhost /
 * Capacitor local). It forces CSS/JS to HTTPS and breaks the UI.
 */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(self), geolocation=(self), payment=(self), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function buildContentSecurityPolicy(isHttps: boolean): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Vite SSR + Stripe.js need inline/eval-adjacent patterns in practice
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
    "font-src 'self' data: https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: http:",
    "worker-src 'self' blob:",
    // ws:/http: needed for Vite HMR on localhost; https/wss for prod
    "connect-src 'self' http: https: ws: wss: https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.stripe.com https://*.lovable.app https://*.lovable.dev https://api.fontshare.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com",
  ];

  if (isHttps) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applySecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);

  let isHttps = false;
  try {
    isHttps = new URL(request.url).protocol === "https:";
  } catch {
    /* ignore invalid URL */
  }

  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", buildContentSecurityPolicy(isHttps));
  }

  // HSTS only on HTTPS (avoid poisoning local http://localhost:8080)
  if (isHttps && !headers.has("Strict-Transport-Security")) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
