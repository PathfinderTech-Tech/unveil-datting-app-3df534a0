import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";

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
    <AppStateScreen
      title={label}
      message="Please wait while we prepare your UNVEIL experience."
      icon={<Loader2 className="h-5 w-5 animate-spin" />}
      tone="neutral"
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