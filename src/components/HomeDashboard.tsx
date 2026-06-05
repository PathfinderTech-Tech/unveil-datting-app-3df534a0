import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadCount } from "@/hooks/use-unread";
import { ArrowRight, Sparkles } from "lucide-react";
import { JourneyMilestones } from "@/components/JourneyMilestones";


// Profile fields we evaluate for completion. Each filled field is one point.
const COMPLETION_FIELDS = [
  "first_name",
  "bio",
  "archetype",
  "interests",
  "relationship_intent",
  "communication_style",
  "love_language",
  "core_values",
  "voice_intro_url",
  "avatar_url",
] as const;

type ProfileSnapshot = {
  first_name: string | null;
  onboarding_complete: boolean | null;
  premium: boolean | null;
  completion: number; // 0–100
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function computeCompletion(row: Record<string, unknown> | null): number {
  if (!row) return 0;
  let filled = 0;
  for (const f of COMPLETION_FIELDS) {
    const v = row[f];
    if (v == null) continue;
    if (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0) filled++;
  }
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export function HomeDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [newMatches, setNewMatches] = useState(0);
  const [featured, setFeatured] = useState<{ id: string; question: string; category: string } | null>(null);
  const [insightsViewed, setInsightsViewed] = useState(false);
  const unread = useUnreadCount();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [profileRes, matchesRes, challengeRes, eventsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "first_name, onboarding_complete, premium, bio, archetype, interests, relationship_intent, communication_style, love_language, core_values, voice_intro_url, avatar_url",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("matched_user_id", user.id)
          .eq("mutual_interest", true),
        supabase
          .from("challenges")
          .select("id, question, category")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("event", "insights_plus_viewed"),
      ]);
      if (!alive) return;
      const p = profileRes.data as Record<string, unknown> | null;
      setProfile({
        first_name: (p?.first_name as string | null) ?? null,
        onboarding_complete: (p?.onboarding_complete as boolean | null) ?? false,
        premium: (p?.premium as boolean | null) ?? false,
        completion: computeCompletion(p),
      });
      setNewMatches(matchesRes.count ?? 0);
      if (challengeRes.data) setFeatured(challengeRes.data);
      setInsightsViewed((eventsRes.count ?? 0) > 0);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  const nudge = useMemo(() => {
    if (profile?.premium) return null;
    if (!insightsViewed) {
      return {
        title: "Unlock deeper Passport Insights",
        body: "See attachment style, communication analysis, and growth areas.",
        cta: "Explore Insights+",
        to: "/insights",
      } as const;
    }
    if (newMatches > 0) {
      return {
        title: "Your next introduction is ready",
        body: "Open a fresh match and start the slow reveal.",
        cta: "Meet your match",
        to: "/matches",
      } as const;
    }
    return null;
  }, [profile?.premium, insightsViewed, newMatches]);

  const name = profile?.first_name?.trim() || "friend";
  const completion = profile?.completion ?? 0;
  const showCompletion = completion < 100;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 pt-10 pb-24 md:pt-14">
      {/* 1. Welcome */}
      <header>
        <h1 className="text-[22px] font-bold leading-tight text-foreground">
          {greeting()}, {name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's waiting for you</p>
      </header>

      {/* 2. Profile completion */}
      {showCompletion && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Your Passport is <span className="font-medium text-foreground">{completion}%</span> complete
            </span>
            {completion < 80 && (
              <Link to="/onboarding" className="text-primary hover:underline">
                Finish your Passport →
              </Link>
            )}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-hero transition-all"
              style={{ width: `${Math.max(4, completion)}%` }}
            />
          </div>
        </section>
      )}

      {/* 3. Stats chips */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/matches"
          className="rounded-2xl border border-border bg-surface-2 px-4 py-4 transition-colors hover:border-primary/40"
        >
          <div className="text-[22px] font-semibold text-primary leading-none">{newMatches}</div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {newMatches === 1 ? "new match" : "new matches"}
          </div>
        </Link>
        <Link
          to="/messages"
          className="rounded-2xl border border-border bg-surface-2 px-4 py-4 transition-colors hover:border-primary/40"
        >
          <div className="text-[22px] font-semibold text-primary leading-none">{unread}</div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {unread === 1 ? "unread message" : "unread messages"}
          </div>
        </Link>
      </section>

      {/* 4. Today's challenge */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {featured?.category ?? "Today's Challenge"}
        </div>
        <div className="mt-2 text-[16px] font-semibold text-foreground">
          {featured?.question ?? "Start a reflection to deepen your next match"}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">2 min</span>
          <Link to="/challenges" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Start <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* 5. Journey milestones (Stage 5 polish) */}
      <JourneyMilestones />

      {/* 6. Rotating contextual nudge (max one) */}

      {nudge && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-semibold text-foreground">{nudge.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{nudge.body}</p>
              <Link
                to={nudge.to}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                {nudge.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
