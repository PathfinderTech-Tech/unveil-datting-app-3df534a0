import { Link } from "@tanstack/react-router";
import { Sparkles, Flame, Brain, Target } from "lucide-react";

/**
 * Hub shown when a user has no matches yet. Keeps them engaged with the
 * Relationship Intelligence loop instead of an empty screen.
 */
export function NoMatchHub({ title = "No matches yet — keep building" }: { title?: string }) {
  const cards = [
    {
      to: "/insights-ai",
      icon: Sparkles,
      title: "Today's compatibility",
      desc: "Answer 4 prompts to sharpen your readiness score.",
    },
    {
      to: "/insights-ai",
      icon: Brain,
      title: "Personality blueprint",
      desc: "Define your communication, attachment, conflict, leadership and relationship styles.",
    },
    {
      to: "/challenges",
      icon: Flame,
      title: "Daily challenge",
      desc: "A small action that compounds into great relationships.",
    },
    {
      to: "/games",
      icon: Target,
      title: "Relationship quiz",
      desc: "Discover patterns in how you connect with others.",
    },
  ] as const;

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-6">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Great matches start with self-knowledge. Pick up where you left off.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              to={c.to}
              className="group flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium group-hover:text-primary">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
