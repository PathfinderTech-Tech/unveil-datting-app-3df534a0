import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Heart, MessageCircle, Sparkles, User } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-unread";

const ITEMS = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/messages", label: "Messages", icon: MessageCircle, badge: true as const },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
] as const;

/**
 * Mobile-only bottom navigation. Inherits the logo palette via tokens —
 * active items get a gradient text + glow, inactive items use muted-foreground.
 */
export function MobileBottomNav() {
  const { location } = useRouterState();
  const unread = useUnreadCount();
  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          const showBadge = "badge" in item && item.badge && unread > 0;
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                className={`relative flex w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active
                    ? "font-semibold u-text-gradient"
                    : "font-normal text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-gradient-logo shadow-glow-magenta"
                  />
                )}
                <span className="relative flex items-center justify-center">
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.2 : 1.8}
                    style={active ? { stroke: "url(#mbn-grad)" } : undefined}
                  />
                  {showBadge && (
                    <span
                      aria-label={`${unread} unread`}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-logo px-1 text-[9px] font-semibold text-primary-foreground shadow-glow-magenta"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* SVG gradient definition reused by active lucide icons */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="mbn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--logo-violet)" }} />
            <stop offset="50%" style={{ stopColor: "var(--logo-magenta)" }} />
            <stop offset="100%" style={{ stopColor: "var(--logo-gold)" }} />
          </linearGradient>
        </defs>
      </svg>
    </nav>
  );
}
