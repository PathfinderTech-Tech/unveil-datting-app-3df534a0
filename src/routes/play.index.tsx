import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Eye, Zap, BookOpen, Trophy, KeyRound, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/play/")({
  head: () => ({ meta: [
    { title: "Play Together — UNVEIL" },
    { name: "description", content: "Multiplayer match games that build real chemistry. Unlocked after you match." },
  ] }),
  component: Play,
});

const GAMES = [
  { to: "/challenges", icon: Flag, name: "Red Flag / Green Flag", desc: "Spot what matters — and what doesn't.", tone: "values" },
  { to: "/play/predict", icon: Eye, name: "Predict Your Match", desc: "Guess how your match answered.", tone: "discovery" },
  { to: "/play/this-or-that", icon: Zap, name: "This or That", desc: "Fast compatibility round.", tone: "chemistry" },
  { to: "/play/story", icon: BookOpen, name: "Story Builder", desc: "Take turns building a story together.", tone: "creative" },
  { to: "/play/quiz", icon: Trophy, name: "Couple Quiz Battle", desc: "Match answers, score speed.", tone: "chemistry" },
  { to: "/play/escape", icon: KeyRound, name: "Relationship Escape Room", desc: "Solve puzzles together — get a Dynamic Score.", tone: "teamwork" },
] as const;

function Play() {
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMatchCount(0); return; }
      const { count } = await supabase.from("matches")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .eq("mutual_interest", true);
      setMatchCount(count ?? 0);
    })();
  }, []);

  const locked = matchCount === 0;

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Phase 3 — Play Together</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Match games.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Chemistry through play. Each game adds depth to your shared signal — and unlocks the next step toward meeting.
          </p>
        </div>

        {locked && (
          <div className="mb-8 rounded-3xl border-2 border-dashed border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 text-accent" />
              <div>
                <div className="font-display text-lg font-bold">Play unlocks after you match.</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Match games are designed for two. Find someone first — then we open the toy box.
                </p>
                <Link to="/matches" className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow">
                  Discover matches <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => {
            const Icon = g.icon;
            return (
              <Link key={g.to} to={g.to}
                className={`group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-glow ${locked ? "pointer-events-none opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-accent" />
                  {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="mt-4 font-display text-xl font-bold">{g.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{g.desc}</div>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{g.tone}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
