import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

type Props = {
  /** Fallback route if there's no history to pop (e.g. deep link). */
  fallback?: string;
  label?: string;
  className?: string;
};

/**
 * Standard back button for deep subpages.
 *
 * Use only on routes reached via deep navigation (chat, match detail,
 * settings subpages, legal pages, etc.). NEVER place on top-level tab
 * roots — those are reached from the bottom tab bar and already act as
 * navigation roots.
 *
 * Preserves history state via router.history.back() so back nav keeps
 * scroll/search params instead of resetting the page.
 */
export function PageBackButton({ fallback = "/", label = "Back", className = "" }: Props) {
  const router = useRouter();

  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.55)] px-3 py-1.5 text-[13px] font-medium text-foreground/85 backdrop-blur-xl transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95 ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
