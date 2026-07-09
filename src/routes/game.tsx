import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Brain, Heart, Sparkles } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Solo Mind Games — UNVEIL" },
      {
        name: "description",
        content: "Play Free Your Mind & Heart and more single-player challenges.",
      },
    ],
  }),
  component: SoloMindGamesHub,
});

type SoloGameTile = {
  to: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  icon: typeof Brain;
};

const SOLO_GAMES: SoloGameTile[] = [
  {
    to: "/challenges/free-your-mind-heart",
    title: "Free Your Mind & Heart",
    subtitle: "New Maze Challenge",
    description: "Clear the paths. Free your heart and mind.",
    badge: "NEW",
    icon: Sparkles,
  },
  {
    to: "/games",
    title: "UNVEIL Love Tiles",
    subtitle: "Memory Challenge",
    description:
      "Match romantic symbols, build streaks, and unlock long-term progression rewards.",
    icon: Heart,
  },
];

export function SoloMindGamesHub() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_8%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_85%_16%,rgba(236,72,153,0.15),transparent_30%),linear-gradient(180deg,rgba(11,11,20,0.98),rgba(8,8,16,1))] pb-24 lg:pb-0">
      <UnveilNav />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link
          to="/challenges"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Challenges
        </Link>

        <section className="mt-5 rounded-3xl border border-primary/25 bg-card/80 p-6 shadow-glow">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            Challenges · Solo Mind Games
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Train your intuition.
            <span className="ml-2 bg-gradient-hero bg-clip-text text-transparent">Play with purpose.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Enter the maze, clear both paths, and sharpen how you move through pressure and choice.
          </p>
        </section>

        <section className="mt-5 space-y-4">
          {SOLO_GAMES.map((tile, index) => {
            const Icon = tile.icon;
            const isNew = tile.badge === "NEW" || tile.badge === "LIVE";

            return (
              <Link
                key={tile.to}
                to={tile.to}
                className={`group block rounded-3xl border bg-card/85 p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow ${
                  isNew ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {index + 1}. {tile.subtitle}
                      </div>
                      <h2 className="mt-1 font-display text-2xl leading-tight text-foreground">
                        {tile.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">{tile.description}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {tile.badge && (
                      <span className="rounded-full bg-gradient-hero px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-primary-foreground">
                        {tile.badge}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
