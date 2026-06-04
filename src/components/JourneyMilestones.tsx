import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { category: string; completion_count: number };

const NEXT_TIER = (n: number) => (n < 3 ? 3 : n < 5 ? 5 : n < 10 ? 10 : n);

/**
 * Stage 5 polish — surfaces the user's values-challenge milestones and
 * Guided First Date progress in a single calm tile on the home dashboard.
 */
export function JourneyMilestones() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dateDone, setDateDone] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setRows([]); return; }
      const [{ data: vals }, { count }] = await Promise.all([
        supabase
          .from("values_challenge_progress")
          .select("category, completion_count")
          .eq("user_id", user.id)
          .order("completion_count", { ascending: false })
          .limit(3),
        supabase
          .from("guided_date_progress")
          .select("step_key", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      if (!alive) return;
      setRows((vals ?? []) as Row[]);
      setDateDone(count ?? 0);
    })();
    return () => { alive = false; };
  }, []);

  if (rows === null) return null;
  const totalValues = rows.reduce((s, r) => s + r.completion_count, 0);
  if (totalValues === 0 && dateDone === 0) return null;

  return (
    <section className="rounded-3xl border border-primary/20 bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <Trophy className="h-3.5 w-3.5" /> Your journey
        </div>
        <Link to="/challenges" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Continue <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const target = NEXT_TIER(r.completion_count);
            const pct = Math.min(100, (r.completion_count / target) * 100);
            return (
              <li key={r.category} className="rounded-2xl border border-border bg-surface/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">{r.category.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{r.completion_count}/{target}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/60">
                  <div className="h-full bg-gradient-hero transition-all" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dateDone > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" /> {dateDone} guided first-date step{dateDone === 1 ? "" : "s"} saved.
        </p>
      )}
    </section>
  );
}
