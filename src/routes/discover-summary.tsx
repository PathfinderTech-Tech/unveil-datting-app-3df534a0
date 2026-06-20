import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PageBackButton } from "@/components/PageBackButton";
import { supabase } from "@/integrations/supabase/client";
import {
  personalitySummary, communicationSummary, compatibilityHeadline,
} from "@/lib/compatibility";
import type { DiscoverAnswers } from "@/lib/discover-sections";
import { ArrowRight, Sparkles, Heart, MessageCircle, Brain } from "lucide-react";

export const Route = createFileRoute("/discover-summary")({
  head: () => ({ meta: [
    { title: "Your Compatibility Profile — UNVEIL" },
    { name: "description", content: "The psychology behind how you connect — and who you'll connect with best." },
  ] }),
  component: Summary,
});

function Summary() {
  const [answers, setAnswers] = useState<DiscoverAnswers | null>(null);

  useEffect(() => {
    (async () => {
      const local = typeof window !== "undefined" ? localStorage.getItem("unveil-discover-v1") : null;
      if (local) try { setAnswers(JSON.parse(local)); } catch { /* noop */ }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("onboarding_answers")
        .select("answers").eq("user_id", user.id).maybeSingle();
      const remote = (data?.answers as { discover?: DiscoverAnswers } | undefined)?.discover;
      if (remote) setAnswers(remote);
    })();
  }, []);

  if (!answers) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">No profile yet.</h1>
          <p className="mt-2 text-muted-foreground">Complete Discover Yourself first.</p>
          <Link to="/discover" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Start Discover <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const headline = compatibilityHeadline(answers);
  const personality = personalitySummary(answers);
  const communication = communicationSummary(answers);
  const goals = (answers.intent as string) || "—";
  const love = (answers.give as string) || "—";

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Your Compatibility Profile</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Here's how you connect.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Generated from your Discover Yourself answers. Used by the matching engine to find people who actually fit you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card icon={<Brain className="h-4 w-4" />} title="Personality" body={personality} />
          <Card icon={<MessageCircle className="h-4 w-4" />} title="Communication" body={communication} />
          <Card icon={<Heart className="h-4 w-4" />} title="What you want" body={`Looking for ${goals}. Love language: ${love}.`} />
        </div>

        <div className="mt-6 rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider opacity-80">
            <Sparkles className="h-3 w-3" /> Headline Compatibility Score
          </div>
          <div className="mt-3 font-display text-7xl font-bold leading-none">{headline}%</div>
          <p className="mt-3 text-sm opacity-90">
            This is your baseline. Each match shows a unique pair score across Communication, Lifestyle, Values, and Relationship Goals.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/matches" className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
            See your matches <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/discover" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-4 text-sm hover:bg-surface-2">
            Refine answers
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      <p className="mt-3 text-sm text-foreground/90">{body}</p>
    </div>
  );
}
