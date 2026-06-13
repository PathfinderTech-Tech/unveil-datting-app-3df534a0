import { Sparkles, CheckCircle2, Phone } from "lucide-react";

/**
 * Contact Exchange Countdown — the 7-Day Contact Exchange Journey.
 *
 * Replaces the legacy SlowRevealTimeline / RevealJourney UI. Photos are
 * visible from Day 1 (after match + first meaningful interaction the veil
 * lifts entirely). The 7-day milestone is ONLY for unlocking the option
 * to exchange phone, email, or social handles — never for photo reveal.
 */
export function ContactExchangeCountdown({ day = 1 }: { day?: number }) {
  const current = Math.max(1, Math.min(7, day));
  const remaining = Math.max(0, 7 - current);
  const complete = current >= 7;
  const dots = [1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        <span>Contact Exchange Countdown</span>
        <span>Day {current} / 7</span>
      </div>
      <div className="flex h-8 items-center gap-3 rounded-full border border-border bg-surface/60 px-3">
        <div className="flex items-center gap-1.5">
          {dots.map((d) => (
            <span
              key={d}
              className={`h-2 w-2 rounded-full transition-colors ${
                d <= current ? "bg-primary shadow-glow" : "bg-border"
              }`}
              aria-label={`Day ${d}`}
            />
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/85">
          {complete ? (
            <CheckCircle2 className="h-3 w-3 text-accent" />
          ) : (
            <Sparkles className="h-3 w-3 text-accent" />
          )}
          {complete
            ? "Contact exchange available"
            : `${remaining} day${remaining === 1 ? "" : "s"} until contact exchange`}
        </span>
      </div>
    </div>
  );
}

/** Card shown on the Contact Exchange tab once the 7-day window has closed. */
export function ContactExchangeReadyCard({ eligible }: { eligible?: boolean }) {
  return (
    <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-glow">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        <Phone className="h-3.5 w-3.5" />
        Day 7 · Contact Exchange unlocked
      </div>
      <div className="mt-2 font-display text-xl font-bold">
        You've spent a week getting to know each other.
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {eligible
          ? "Both of you can now opt in to share phone, email, or social handles and continue the conversation outside UNVEIL."
          : "Contact exchange becomes available once both members meet eligibility (verification + mutual opt-in)."}
      </p>
    </div>
  );
}
