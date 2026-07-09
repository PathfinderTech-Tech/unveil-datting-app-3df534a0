import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "neutral" | "warning" | "error";

function toneClass(tone: Tone): string {
  if (tone === "error") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (tone === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-border bg-card text-foreground";
}

export function AppStateScreen({
  title,
  message,
  tone = "neutral",
  icon,
  primaryLabel,
  primaryTo,
  onPrimary,
  secondaryLabel,
  secondaryTo,
}: {
  title: string;
  message: string;
  tone?: Tone;
  icon?: ReactNode;
  primaryLabel?: string;
  primaryTo?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
}) {
  return (
    <div className="min-h-[60vh] px-4 py-10">
      <div className={`mx-auto max-w-xl rounded-3xl border p-6 text-center ${toneClass(tone)}`}>
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/60">
          {icon ?? <AlertTriangle className="h-5 w-5" />}
        </div>
        <h2 className="font-display text-2xl font-light">{title}</h2>
        <p className="mt-2 text-sm opacity-90">{message}</p>
        {(primaryLabel || secondaryLabel) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {primaryLabel && primaryTo && (
              <Link
                to={primaryTo}
                className="rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
              >
                {primaryLabel}
              </Link>
            )}
            {primaryLabel && !primaryTo && onPrimary && (
              <button
                type="button"
                onClick={onPrimary}
                className="rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
              >
                {primaryLabel}
              </button>
            )}
            {secondaryLabel && secondaryTo && (
              <Link
                to={secondaryTo}
                className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </div>
        <p className="mb-4 text-center text-sm text-muted-foreground">{label}</p>
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-10 w-40 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function LoadingTimeoutScreen({
  title = "This is taking longer than expected",
  message = "UNVEIL is still responsive. Please retry this screen.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <AppStateScreen
      title={title}
      message={message}
      tone="warning"
      primaryLabel="Retry"
      onPrimary={onRetry ?? (() => window.location.reload())}
      secondaryLabel="Go home"
      secondaryTo="/"
    />
  );
}

export function OfflineScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <AppStateScreen
      title="No internet connection"
      message="UNVEIL could not reach the network. Check your connection and try again."
      icon={<WifiOff className="h-5 w-5" />}
      tone="warning"
      primaryLabel="Try again"
      onPrimary={onRetry}
      secondaryLabel="Go home"
      secondaryTo="/"
    />
  );
}