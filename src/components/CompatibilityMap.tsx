import { Lock } from "lucide-react";

type Row = {
  label: string;
  value: number; // 0–100
  note?: string; // honest 1-line, required for Medium / friction
};

function strength(v: number): { label: string; tone: string } {
  if (v >= 80) return { label: "Strong", tone: "text-primary" };
  if (v >= 65) return { label: "High", tone: "text-foreground" };
  if (v >= 45) return { label: "Medium", tone: "text-yellow-500" };
  return { label: "Low", tone: "text-yellow-600" };
}

export function CompatibilityMap({
  rows,
  premium = false,
}: {
  rows: Row[];
  premium?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Why you match
      </h2>
      <div className="mt-4 space-y-4">
        {rows.map((r) => {
          const s = strength(r.value);
          const showNote = r.note && (s.label === "Medium" || s.label === "Low");
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{r.label}</span>
                <span className={`font-mono text-xs ${s.tone}`}>{s.label}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gradient-hero transition-all"
                  style={{ width: `${Math.max(4, r.value)}%` }}
                />
              </div>
              {showNote && (
                <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                  {r.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!premium && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-surface/40 p-4">
          <div className="space-y-3" style={{ filter: "blur(4px)", opacity: 0.7 }}>
            {["Conflict approach", "Emotional depth", "Long-term vision"].map((l) => (
              <div key={l}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{l}</span>
                  <span className="font-mono text-xs">Strong</span>
                </div>
                <div className="h-1 rounded-full bg-gradient-hero" style={{ width: "80%" }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-primary">
            <Lock className="h-3 w-3" /> Unlock full Compatibility Map with Premium
          </div>
        </div>
      )}
    </div>
  );
}
