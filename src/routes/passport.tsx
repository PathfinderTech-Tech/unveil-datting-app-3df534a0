import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { BADGES, useProfile } from "@/lib/synapse-store";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { loadBadges, useUserId } from "@/lib/games-api";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { BetaBadge } from "@/components/BetaBadge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/passport")({
  head: () => ({ meta: [{ title: "UNVEIL Passport" }, { name: "description", content: "Your dating badges, earned through real connection." }] }),
  component: Passport,
});

function Passport() {
  const [profile] = useProfile();
  const uid = useUserId();
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [isBeta, setIsBeta] = useState(false);

  // Load real earned badges from DB
  useEffect(() => {
    if (!uid) return;
    loadBadges().then(setUnlockedIds);
    supabase.from("profiles").select("beta_member").eq("id", uid).maybeSingle()
      .then(({ data }) => setIsBeta(!!data?.beta_member));
  }, [uid]);

  // Fall back to a tiny demo set only when not signed in
  const unlocked = new Set<string>(
    uid ? unlockedIds : profile ? ["adventurer"] : []
  );

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">UNVEIL Passport</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-bold md:text-5xl">Your dating journey, stamped.</h1>
            {isBeta && <BetaBadge />}
          </div>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Badges aren't trophies. They're proof you showed up — honestly, generously, playfully.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-border bg-gradient-hero p-6 text-primary-foreground shadow-glow">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5" />
            <div className="font-display text-xl font-bold">
              {unlocked.size} of {BADGES.length} earned
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full bg-primary-foreground/80" style={{ width: `${(unlocked.size / BADGES.length) * 100}%` }} />
          </div>
        </div>

        {uid && (
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <VoiceRecorder userId={uid} prompt="A small ritual that makes my day feel like mine." />
            <VoiceRecorder userId={uid} prompt="The last idea that kept me up — and why." />
          </div>
        )}


        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const got = unlocked.has(b.id);
            return (
              <div key={b.id}
                className={`rounded-3xl border p-5 transition-all ${got ? "border-primary bg-card shadow-glow" : "border-border bg-card opacity-60"}`}>
                <div className="flex items-start justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${got ? "bg-gradient-hero" : "bg-surface"}`}>
                    {got ? b.icon : "🔒"}
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${
                    b.rarity === "elite" ? "text-accent" : b.rarity === "rare" ? "text-primary" : "text-muted-foreground"
                  }`}>{b.rarity}</span>
                </div>
                <div className="mt-4 font-display text-lg font-bold">{b.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.description}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link to="/challenges" className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
            Earn more in Challenges →
          </Link>
        </div>
      </div>
    </div>
  );
}
