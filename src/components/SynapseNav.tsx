import { Link, useRouterState } from "@tanstack/react-router";
import { Brain } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/onboarding", label: "Join" },
  { to: "/game", label: "Game" },
  { to: "/matches", label: "Matches" },
];

export function SynapseNav() {
  const { location } = useRouterState();
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </span>
          SYNAPSE
        </Link>
        <nav className="hidden gap-1 md:flex">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link
          to="/onboarding"
          className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-transform hover:scale-105"
        >
          Get your score
        </Link>
      </div>
    </header>
  );
}
