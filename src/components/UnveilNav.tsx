import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark, LogoWordmark } from "./LogoHeader";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";

// Order follows the user journey: arrive → set up → discover → connect →
// (optional play) → unlock → meet → track → upgrade.
const links = [
  { to: "/", label: "Home" },
  { to: "/onboarding", label: "Begin" },
  { to: "/spark", label: "Spark" },
  { to: "/matches", label: "Matches" },
  { to: "/challenges", label: "Challenges" },
  { to: "/puzzles", label: "Puzzles" },
  { to: "/contact-share", label: "Share" },
  { to: "/date-plan", label: "Date" },
  { to: "/passport", label: "Passport" },
  { to: "/premium", label: "Membership" },
] as const;

export function UnveilNav() {
  const { location } = useRouterState();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <LogoMark size={32} />
          <LogoWordmark size={18} />
        </Link>
        <nav className="hidden gap-1 lg:flex">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:block"><LanguageSwitcher variant="compact" /></div>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface"
            >
              Sign out
            </button>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface">Log in</Link>
              <Link to="/signup" className="rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">Sign up</Link>
            </div>
          )}
          <button onClick={() => setOpen((o) => !o)} className="rounded-full border border-border bg-surface/60 p-2 lg:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background/95 lg:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-6 py-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground">
                {l.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm">Log in</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="rounded-xl bg-gradient-hero px-3 py-2 text-sm text-primary-foreground">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
