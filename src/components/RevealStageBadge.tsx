import { Sparkles } from "lucide-react";

/**
 * Emotional stage badge shown above slow-reveal conversations.
 * Day 1 → First Discovery
 * Day 2 → Building Trust
 * Day 3-4 → Meaningful Conversation
 * Day 5+ → Reveal Approaching
 */
export function stageForDay(day: number): { label: string; tone: string } {
  if (day <= 1) return { label: "First Discovery", tone: "text-accent" };
  if (day === 2) return { label: "Building Trust", tone: "text-primary" };
  if (day <= 4) return { label: "Meaningful Conversation", tone: "text-primary" };
  return { label: "Reveal Approaching", tone: "text-accent" };
}

export function RevealStageBadge({ day }: { day: number }) {
  const safe = Math.max(1, Math.min(7, day));
  const { label, tone } = stageForDay(safe);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/40 px-4 py-2.5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-hero/20 ${tone}`}>
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <div className={`text-[13px] font-medium leading-tight ${tone}`}>{label}</div>
          <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
            Day {safe} of 7
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span
            key={d}
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              d <= safe ? "bg-gradient-hero" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
