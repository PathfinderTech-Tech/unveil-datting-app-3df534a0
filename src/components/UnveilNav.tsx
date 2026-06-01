import { Link, useRouterState } from "@tanstack/react-router";
import { LogoMark, LogoWordmark } from "./LogoHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/", label: "Home" },
  { to: "/onboarding", label: "Begin" },
  { to: "/spark", label: "Spark" },
  { to: "/puzzles", label: "Puzzles" },
  { to: "/games", label: "Games" },
  { to: "/matches", label: "Matches" },
  { to: "/challenges", label: "Challenges" },
  { to: "/passport", label: "Passport" },
  { to: "/premium", label: "Premium" },
] as const;


export function UnveilNav() {
  const { location } = useRouterState();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <LogoMark size={32} />
          <LogoWordmark size={18} />
        </Link>
        <nav className="hidden gap-1 md:flex">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        {user ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface"
          >
            Sign out
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
