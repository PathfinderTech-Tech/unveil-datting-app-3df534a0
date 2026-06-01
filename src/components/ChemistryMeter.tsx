/**
 * ChemistryMeter — score derived from conversation quality, shared values,
 * humor alignment, Spark answers, challenge participation. NEVER appearance.
 */
export type ChemistrySignals = {
  conversation: number;   // 0-100
  values: number;
  humor: number;
  spark: number;
  challenges: number;
};

export function chemistryScore(s: ChemistrySignals): number {
  return Math.round(
    s.conversation * 0.25 +
    s.values * 0.25 +
    s.humor * 0.2 +
    s.spark * 0.2 +
    s.challenges * 0.1
  );
}

export function ChemistryMeter({ signals }: { signals: ChemistrySignals }) {
  const score = chemistryScore(signals);
  const rows: { label: string; v: number }[] = [
    { label: "Conversation quality", v: signals.conversation },
    { label: "Shared values",        v: signals.values },
    { label: "Humor alignment",      v: signals.humor },
    { label: "Spark compatibility",  v: signals.spark },
    { label: "Challenge engagement", v: signals.challenges },
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chemistry meter</div>
          <div className="font-display text-4xl font-light">{score}<span className="text-base text-muted-foreground">/100</span></div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          Built from how you talk —<br />never how you look.
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-mono text-foreground/80">{r.v}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-gradient-hero" style={{ width: `${r.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
