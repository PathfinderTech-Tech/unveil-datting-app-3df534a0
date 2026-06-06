import { Link } from "@tanstack/react-router";
import { LogoMark } from "./LogoHeader";
import { MailActions } from "./MailActions";

const LEGAL = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refund", label: "Refund Policy" },
  { to: "/cookies", label: "Cookies" },
  { to: "/community-guidelines", label: "Community" },
  { to: "/safety", label: "Safety" },
  { to: "/support", label: "Support" },
  { to: "/contact", label: "Contact" },
] as const;

const PRODUCT = [
  { to: "/discover", label: "Discover" },
  { to: "/matches", label: "Matches" },
  { to: "/premium", label: "Membership" },
  { to: "/passport", label: "Passport" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <LogoMark size={28} />
              <span className="font-display text-xl font-light tracking-luxury">UNVEIL</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Compatibility-first dating. Meaningful connections form before appearance becomes central.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <MailActions />
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Product</h4>
            <ul className="space-y-2">
              {PRODUCT.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-foreground/80 hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Legal</h4>
            <ul className="space-y-2">
              {LEGAL.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-foreground/80 hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} UNVEIL. All rights reserved.</p>
          <p>
            Made with intention ·{" "}
            <a href="https://unveil.best" className="hover:text-foreground">unveil.best</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
