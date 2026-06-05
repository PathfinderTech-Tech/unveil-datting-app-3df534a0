import { Sparkles, CheckCircle2 } from "lucide-react";

const STAGES = [
  { day: 1, label: "Values" },
  { day: 2, label: "Lifestyle" },
  { day: 3, label: "Communication style" },
  { day: 4, label: "Relationship goals" },
  { day: 5, label: "Personality & habits" },
  { day: 6, label: "Future vision" },
  { day: 7, label: "Contact reveal decision" },
] as const;

export function SlowRevealTimeline({ day = 1 }: { day?: number }) {
  const current = Math.max(1, Math.min(7, day));
  const stage = STAGES[current - 1];
  const complete = current >= 7;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        <span>Contact Sharing Progress</span>
        <span>Day {current} / 7</span>
      </div>
      <div className="flex h-8 items-center gap-3 rounded-full border border-border bg-surface/60 px-3">
        <div className="flex items-center gap-1.5">
          {STAGES.map((s) => {
            const done = s.day <= current;
            return (
              <span
                key={s.day}
                className={`h-2 w-2 rounded-full transition-colors ${
                  done ? "bg-primary shadow-glow" : "bg-border"
                }`}
                aria-label={`Day ${s.day}`}
              />
            );
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/85">
          {complete ? (
            <CheckCircle2 className="h-3 w-3 text-accent" />
          ) : (
            <Sparkles className="h-3 w-3 text-accent" />
          )}
          Day {current} · {stage.label}
        </span>
      </div>
    </div>
  );
}

export function JourneyCompletionCard({ eligible }: { eligible?: boolean }) {
  return (
    <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-glow">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Day 7 · Journey complete
      </div>
      <div className="mt-2 font-display text-xl font-bold">
        Congratulations. You have completed the UNVEIL journey together.
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {eligible
          ? "Contact sharing is now available — both members meet eligibility requirements. Opt in below to exchange real-world contact details."
          : "Contact sharing is now available if both members meet eligibility requirements (verification + mutual opt-in)."}
      </p>
    </div>
  );
}
