import { Sparkles } from "lucide-react";

/**
 * Emotional stage badge shown above a match thread.
 * Reflects rapport phase only — photos are visible from Day 1.
 * The Day-7 milestone is the Contact Exchange unlock, not a photo reveal.
 */
export function stageForDay(day: number): { label: string; tone: string } {
  if (day <= 1) return { label: "First Discovery", tone: "text-accent" };
  if (day === 2) return { label: "Building Trust", tone: "text-primary" };
  if (day <= 4) return { label: "Meaningful Conversation", tone: "text-primary" };
  if (day <= 6) return { label: "Deepening Connection", tone: "text-primary" };
  return { label: "Contact Exchange Available", tone: "text-accent" };
}

export function ConversationStageBadge({ day }: { day: number }) {
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
            Day {safe} of 7 · Contact Exchange
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
