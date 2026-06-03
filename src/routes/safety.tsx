import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { MailActions } from "@/components/MailActions";
import { Shield, Phone, MapPin, EyeOff, Flag, Mail, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & Reporting — UNVEIL" },
      { name: "description", content: "How to stay safe on UNVEIL and report unsafe behavior." },
      { property: "og:title", content: "Safety & Reporting — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/safety" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/safety" }],
  }),
  component: Safety,
});

const TIPS = [
  { icon: <MapPin className="h-5 w-5" />, title: "Meet in public", desc: "First meetings should always be in a busy, public location." },
  { icon: <Phone className="h-5 w-5" />, title: "Tell a trusted person", desc: "Share when and where you're meeting with someone you trust." },
  { icon: <Shield className="h-5 w-5" />, title: "Use your own transport", desc: "Arrange and pay for your own ride to and from the meeting." },
  { icon: <EyeOff className="h-5 w-5" />, title: "Never share financial info", desc: "No legitimate match will ever ask for money or financial details." },
  { icon: <Flag className="h-5 w-5" />, title: "Report suspicious behavior", desc: "Use the report button. Our team reviews every report." },
  { icon: <AlertTriangle className="h-5 w-5" />, title: "Block unsafe users", desc: "Blocking is immediate and they will not be notified." },
];

function Safety() {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Shield className="mb-4 h-10 w-10 text-accent" />
        <h1 className="font-display text-5xl font-light">Your safety is sacred.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          UNVEIL is designed for intentional connection. These guidelines help you protect
          yourself as conversations move into the world.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">{t.icon}</div>
              <h3 className="font-display text-xl font-light">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-accent/30 bg-accent/5 p-8">
          <Mail className="mb-3 h-6 w-6 text-accent" />
          <h2 className="font-display text-2xl font-light">Need help?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reach our safety team directly:</p>
          <div className="mt-3 flex justify-center"><MailActions subject="Safety report" /></div>
        </div>
        <div className="mt-8 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground underline">Read full Terms & Conditions</Link>
        </div>
      </section>
    </div>
  );
}
