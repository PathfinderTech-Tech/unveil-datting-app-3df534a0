import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark, LogoWordmark } from "./LogoHeader";

import { useAuth } from "@/hooks/use-auth";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Settings as SettingsIcon } from "lucide-react";
import { ReviewerBadge } from "./ReviewerBadge";

// Desktop primary navigation. Authenticated journey: Discover → Compatibility →
// Messages → Matches → Insights → Profile → Passport → Settings.
const PRIMARY = [
  { to: "/discover", label: "Discover" },
  { to: "/insights", label: "Insights" },
  { to: "/challenges", label: "Challenges" },
  { to: "/matches", label: "Matches" },
  { to: "/messages", label: "Messages" },
  { to: "/profile", label: "Profile" },
  { to: "/passport", label: "Passport" },
  { to: "/settings", label: "Settings" },
] as const;

// Sectioned mobile drawer — Core / Identity / Account / Legal.
const SECTIONS: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Core",
    items: [
      { to: "/discover", label: "Discover" },
      { to: "/messages", label: "Messages" },
      { to: "/matches", label: "Matches" },
    ],
  },
  {
    label: "Identity",
    items: [
      { to: "/passport", label: "Passport" },
      { to: "/insights", label: "Insights" },
      { to: "/challenges", label: "Challenges" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/premium", label: "Membership" },
      { to: "/contact-share", label: "Share & Invite" },
      { to: "/settings", label: "Settings" },
    ],
  },
  {
    label: "Legal",
    items: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Use" },
      { to: "/support", label: "Support" },
    ],
  },
];

export function UnveilNav() {
  const { location } = useRouterState();
  const { user } = useAuth();
  const badges = useNavBadges();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <LogoMark size={32} />
          <LogoWordmark size={18} />
        </Link>
        <nav className="hidden gap-1 lg:flex">
          {PRIMARY.map((l) => {
            const active = location.pathname === l.to;
            const count = l.to === "/messages" ? badges.messages
              : l.to === "/matches" ? badges.matches
              : l.to === "/discover" ? badges.discover
              : 0;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
                {count > 0 && (
                  <span
                    aria-label={`${count} new`}
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ReviewerBadge className="hidden sm:inline-flex" />
          {user ? (
            <>
              <Link
                to="/settings"
                aria-label="Settings"
                title="Settings"
                className="rounded-full border border-border bg-surface/60 p-2 hover:bg-surface"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface">Log in</Link>
              <Link to="/signup" className="rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">Sign up</Link>
            </div>
          )}
          <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" className="rounded-full border border-border bg-surface/60 p-2 lg:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background/95 lg:hidden">
          <nav className="mx-auto max-w-7xl px-6 py-4">
            {SECTIONS.map((section, idx) => (
              <div
                key={section.label}
                className={idx > 0 ? "mt-4 border-t border-border pt-4" : ""}
              >
                <div className="px-2 pb-2 text-[13px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {section.label}
                </div>
                <div className="flex flex-col gap-2">
                  {section.items.map((l) => {
                    const active = location.pathname === l.to;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className={`rounded-xl px-3 py-2 text-[15px] transition-colors ${
                          active ? "bg-primary/15 text-foreground" : "text-foreground/90 hover:bg-surface"
                        }`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {!user && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl border border-border px-3 py-2 text-center text-sm">Log in</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="rounded-xl bg-gradient-hero px-3 py-2 text-center text-sm text-primary-foreground">Sign up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
