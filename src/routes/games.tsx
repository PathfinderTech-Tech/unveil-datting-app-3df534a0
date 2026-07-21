import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import {
  Sparkles,
  Heart,
  Brain,
  Map as MapIcon,
  Flag,
  Eye,
  Zap,
  BookOpen,
  Trophy,
  KeyRound,
  Swords,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — UNVEIL" },
      {
        name: "description",
        content:
          "All UNVEIL games in one place. Play solo mind games, couple challenges, and multiplayer chemistry games.",
      },
      { property: "og:title", content: "Games — UNVEIL" },
      {
        property: "og:description",
        content:
          "Play first. Connect deeper. Pick from every UNVEIL game — solo, couple, and match games.",
      },
    ],
  }),
  component: GamesHub,
});

type Tile = {
  to: string;
  title: string;
  desc: string;
  icon: typeof Heart;
  badge?: string;
  section: "solo" | "match" | "couple";
};

const TILES: Tile[] = [
  // Solo / signature
  {
    to: "/challenges/free-your-mind-heart",
    title: "Free Your Mind & Heart",
    desc: "UNVEIL's flagship maze. Clear both paths to free the arrows.",
    icon: Sparkles,
    badge: "SIGNATURE",
    section: "solo",
  },
  {
    to: "/love-tiles",
    title: "UNVEIL Love Tiles",
    desc: "Match the symbols of love. Earn chemistry for your Passport.",
    icon: Heart,
    section: "solo",
  },
  {
    to: "/game",
    title: "Solo Mind Games Hub",
    desc: "Enter every solo challenge from one focused hub.",
    icon: Brain,
    section: "solo",
  },
  {
    to: "/journey",
    title: "UNVEIL Journey",
    desc: "Walk the world together. Solo or with a match.",
    icon: MapIcon,
    section: "solo",
  },

  // Match / multiplayer
  {
    to: "/play/red-green",
    title: "Red Flag / Green Flag",
    desc: "Spot what matters — and what doesn't.",
    icon: Flag,
    section: "match",
  },
  {
    to: "/play/predict",
    title: "Predict Your Match",
    desc: "Guess how your match answered.",
    icon: Eye,
    section: "match",
  },
  {
    to: "/play/this-or-that",
    title: "This or That",
    desc: "Fast compatibility round.",
    icon: Zap,
    section: "match",
  },
  {
    to: "/play/story",
    title: "Story Builder",
    desc: "Take turns building a story together.",
    icon: BookOpen,
    section: "match",
  },
  {
    to: "/play/quiz",
    title: "Couple Quiz Battle",
    desc: "Match answers, score speed.",
    icon: Trophy,
    section: "match",
  },
  {
    to: "/play/escape",
    title: "Relationship Escape Room",
    desc: "Solve puzzles together — earn a Dynamic Score.",
    icon: KeyRound,
    section: "match",
  },

  // Couple challenges
  {
    to: "/challenges",
    title: "Couple Challenges",
    desc: "Would You Rather, Values, Future Vision & more.",
    icon: Swords,
    section: "couple",
  },
];

const SECTIONS: { id: Tile["section"]; label: string; blurb: string }[] = [
  { id: "solo", label: "Solo Games", blurb: "Play on your own. Sharpen intuition." },
  { id: "match", label: "Match Games", blurb: "Two players. Chemistry through play." },
  { id: "couple", label: "Couple Challenges", blurb: "Reflect together. Pick winners." },
];

function GamesHub() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_8%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_85%_16%,rgba(236,72,153,0.15),transparent_30%),linear-gradient(180deg,rgba(11,11,20,0.98),rgba(8,8,16,1))] pb-24 lg:pb-0">
      <UnveilNav />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            UNVEIL · Games
          </div>
          <h1 className="mt-2 font-display text-5xl font-bold">
            Play first.{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">Connect deeper.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Every UNVEIL game in one place. Pick a solo challenge, a match game, or a couple pack —
            they all add signal to your Passport.
          </p>
        </div>

        {SECTIONS.map((section) => {
          const tiles = TILES.filter((t) => t.section === section.id);
          return (
            <section key={section.id} className="mb-10">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {section.label}
                  </div>
                  <h2 className="mt-1 font-display text-2xl">{section.blurb}</h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tiles.map((tile) => {
                  const Icon = tile.icon;
                  const highlight = tile.badge === "SIGNATURE" || tile.badge === "NEW";
                  return (
                    <Link
                      key={tile.to}
                      to={tile.to}
                      className={`group relative rounded-3xl border bg-card/85 p-5 transition-all hover:-translate-y-1 hover:shadow-glow ${
                        highlight ? "border-primary/50 ring-1 ring-primary/25" : "border-border hover:border-primary"
                      }`}
                    >
                      {tile.badge && (
                        <span className="absolute right-4 top-4 rounded-full bg-gradient-hero px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                          {tile.badge}
                        </span>
                      )}
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="mt-4 font-display text-xl leading-tight">{tile.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tile.desc}</div>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                        Play{" "}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
