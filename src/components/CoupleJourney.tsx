import { useEffect, useState } from "react";
import { Heart, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

type Props = { matchId: string; userId: string };

const MILESTONES = [
  { day: 1, label: "First spark", hint: "Say hello with intention." },
  { day: 2, label: "Voice arrives", hint: "Share a 20-second voice note." },
  { day: 3, label: "Values revealed", hint: "Compare your top 3 values." },
  { day: 4, label: "Communication map", hint: "Trade one thing you each need." },
  { day: 5, label: "Photo softens", hint: "Photos unblur together." },
  { day: 6, label: "Shared question", hint: "Answer the same prompt." },
  { day: 7, label: "Meet — if it feels right", hint: "Plan a slow first date." },
];

export function CoupleJourney({ matchId, userId }: Props) {
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("reveal_progress")
      .select("day")
      .eq("match_id", matchId)
      .then(({ data }) => {
        setUnlocked(new Set((data ?? []).map((r: any) => r.day as number)));
      });
  }, [matchId]);

  async function markDay(day: number) {
    if (unlocked.has(day) || busy !== null) return;
    setBusy(day);
    const { error } = await supabase
      .from("reveal_progress")
      .insert({ match_id: matchId, user_id: userId, day });
    setBusy(null);
    if (error) {
      toast.error("Could not save — try again.");
      return;
    }
    setUnlocked((prev) => new Set(prev).add(day));
    trackEvent("couple_journey_milestone", { match_id: matchId, day });
    toast.success(`Day ${day} marked together.`);
  }

  const progress = unlocked.size / MILESTONES.length;

  return (
    <section className="rounded-3xl border border-primary/20 bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            <Heart className="h-3.5 w-3.5" /> Couple Journey
          </div>
          <h3 className="mt-1 font-display text-xl font-light">Your 7-day reveal, together.</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl">{unlocked.size}<span className="text-muted-foreground">/{MILESTONES.length}</span></div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">unlocked</div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div className="h-full rounded-full bg-gradient-hero transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="mt-5 space-y-2">
        {MILESTONES.map((m) => {
          const done = unlocked.has(m.day);
          return (
            <li key={m.day} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${done ? "border-primary/40 bg-primary/5" : "border-border bg-surface/30"}`}>
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs ${done ? "bg-gradient-hero text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                {done ? <Check className="h-4 w-4" /> : m.day}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.hint}</div>
              </div>
              {!done && (
                <button
                  onClick={() => markDay(m.day)}
                  disabled={busy === m.day}
                  className="flex-shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {busy === m.day ? "…" : "Mark"}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
        <Sparkles className="h-3 w-3 text-accent" /> Either of you can mark a milestone — it stays shared.
      </p>
    </section>
  );
}
