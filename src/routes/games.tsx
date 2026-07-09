import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { CoupleChallengesSection } from "@/components/CoupleChallengesSection";
import {
  Sparkles, Brain, Heart, Compass, Globe, MessageCircle, Calendar,
  Users, Play, ArrowRight,
} from "lucide-react";

type SearchParams = { cat?: string; u?: string };

export const Route = createFileRoute("/games")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
    u: typeof s.u === "string" ? s.u : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Play First. Connect Deeper. — UNVEIL" },
      { name: "description", content: "Every UNVEIL game and reflection in one hub. Play together, earn rewards, discover each other." },
    ],
  }),
  component: GamesHub,

});

type Card = {
  to: string;
  title: string;
  emoji: string;
  desc: string;
  icon: any;
  hue: string;
  difficulty?: "Easy" | "Medium" | "Deep";
  reward?: string;
  badge?: "NEW" | "LIVE";
  cta?: "Play" | "Continue" | "Open";
};

const FEATURED: Card[] = [
  { to: "/journey", title: "UNVEIL Journey", emoji: "🌍", desc: "Walk the world together. Real steps become real distance.", icon: Globe, hue: "from-indigo-500/40 to-pink-500/10", difficulty: "Easy", reward: "Stamps + XP", badge: "NEW", cta: "Play" },
  { to: "/love-tiles", title: "Love Tiles", emoji: "❤️", desc: "Piece by piece, love comes into focus.", icon: Heart, hue: "from-pink-500/40 to-fuchsia-500/10", difficulty: "Easy", reward: "Love Points", badge: "NEW", cta: "Play" },
  { to: "/challenges/free-your-mind-heart", title: "Free Your Mind & Heart", emoji: "🧠❤️", desc: "Guide the mind and the heart to freedom across 30 levels.", icon: Compass, hue: "from-indigo-500/40 to-purple-500/10", difficulty: "Medium", reward: "Chemistry", badge: "LIVE", cta: "Play" },
];

const SOLO: Card[] = [
  { to: "/play", title: "Memory Match", emoji: "🧩", desc: "Match pairs. Sharpen your matching signal.", icon: Brain, hue: "from-violet-500/30 to-indigo-500/10", difficulty: "Easy", reward: "Chemistry pts", cta: "Play" },
  { to: "/spark", title: "Icebreakers", emoji: "💬", desc: "Short prompts that shape your bio and open conversations.", icon: MessageCircle, hue: "from-cyan-500/30 to-blue-500/10", difficulty: "Easy", reward: "Bio depth", cta: "Play" },
  { to: "/insights-ai", title: "Daily Personality Question", emoji: "📅", desc: "One thoughtful prompt a day. Builds your Discovery Profile.", icon: Calendar, hue: "from-amber-500/30 to-rose-500/10", difficulty: "Easy", reward: "Insight", cta: "Play" },
];

const COUPLE: Card[] = [
  { to: "/journey", title: "Walk the World (Couple)", emoji: "🌍", desc: "Combine steps with your match to cross continents together.", icon: Users, hue: "from-emerald-500/30 to-teal-500/10", difficulty: "Easy", reward: "Shared miles", cta: "Play" },
];


const COMMUNITY: Card[] = [
  { to: "/insights-ai", title: "Community Reflections", emoji: "🌎", desc: "See how your answers compare with the wider UNVEIL community.", icon: Sparkles, hue: "from-fuchsia-500/30 to-purple-500/10", difficulty: "Easy", reward: "Perspective", cta: "Open" },
];

// Seasonal Events and other unfinished experiences are gated behind this flag.
// Keep it OFF in production until the feature is fully implemented and polished.
const SHOW_UPCOMING_GAMES = false;


function Section({ label, cards }: { label: string; cards: Card[] }) {
  return (
    <section className="mb-10">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <GameCard key={`${label}-${c.title}`} card={c} />)}
      </div>
    </section>
  );
}

function GameCard({ card }: { card: Card }) {
  const Icon = card.icon;
  const content = (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${card.hue} opacity-70`} />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          {card.badge && (
            <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] bg-gradient-hero text-primary-foreground">
              {card.badge}
            </span>
          )}
        </div>
        <h3 className="font-display text-xl font-light">
          <span className="mr-1.5">{card.emoji}</span>{card.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {card.difficulty && (
            <span className="rounded-full border border-border bg-card/60 px-2 py-0.5">{card.difficulty}</span>
          )}
          {card.reward && (
            <span className="rounded-full border border-border bg-card/60 px-2 py-0.5">🏆 {card.reward}</span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary">
            <Play className="h-3 w-3 fill-current" /> {card.cta ?? "Play"}
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </>
  );

  const className = "group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow";

  return <Link to={card.to} className={className}>{content}</Link>;
}

function GamesHub() {
  const search = useRouterState({ select: (s) => s.location.search }) as SearchParams;
  const coupleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.cat && coupleRef.current) {
      coupleRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [search.cat]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Games</div>
          <h1 className="mt-2 font-display text-5xl font-light md:text-6xl">
            Play <span className="text-gradient-hero italic">first.</span> Connect <span className="text-gradient-hero italic">deeper.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Play together. Earn rewards. Discover each other.
          </p>
        </header>

        <Section label="Featured" cards={FEATURED} />
        <Section label="Solo" cards={SOLO} />
        <Section label="With your match" cards={COUPLE} />

        <section ref={coupleRef} className="mb-10 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Couple Reflection Games</div>
          </div>
          <CoupleChallengesSection initialCategory={search.cat} initialPartner={search.u} />
        </section>

        <Section label="Daily & community" cards={COMMUNITY} />
        {SHOW_UPCOMING_GAMES && null}
      </div>
    </div>
  );
}

