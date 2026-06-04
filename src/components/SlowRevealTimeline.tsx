import { Sparkles } from "lucide-react";

const STAGES = [
  { day: 1, label: "Text introduction" },
  { day: 2, label: "Voice note revealed" },
  { day: 3, label: "Personality insights revealed" },
  { day: 4, label: "Shared challenge unlocked" },
  { day: 5, label: "Partial photo unlocked" },
  { day: 6, label: "Full photos revealed" },
  { day: 7, label: "Date readiness unlocked" },
] as const;

export function SlowRevealTimeline({ day = 1 }: { day?: number }) {
  const current = Math.max(1, Math.min(7, day));
  const stage = STAGES[current - 1];
  return (
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
        <Sparkles className="h-3 w-3 text-accent" />
        Day {current} · {stage.label}
      </span>
    </div>
  );
}
