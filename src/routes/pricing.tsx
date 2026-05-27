import { createFileRoute, Link } from "@tanstack/react-router";
import { SynapseNav } from "@/components/SynapseNav";
import { Check, Sparkles, Crown, Waves } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "SYNAPSE+ & SYNAPSE Black — Pricing" },
      { name: "description", content: "Premium emotional intelligence tools. You're not paying for access to people — you're paying for clarity, intention, and insight." },
      { property: "og:title", content: "SYNAPSE — Premium relational intelligence" },
      { property: "og:description", content: "SYNAPSE+, $24/mo. SYNAPSE Black, $79–149/mo. Elegant. Intentional. Never aggressive." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div className="min-h-screen">
      <SynapseNav />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            You are not paying for access to people.
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold md:text-6xl">
            Pay for <span className="text-gradient-hero">clarity</span>, not swipes.
          </h1>
          <p className="mt-5 text-muted-foreground">
            SYNAPSE is free to explore. Premium unlocks deeper emotional insight,
            slower-burn intelligence, and a more intentional ecosystem.
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {/* FREE */}
          <Tier
            badge="Free"
            icon={<Waves className="h-5 w-5" />}
            price="$0"
            cadence="forever"
            blurb="Discover your archetype and feel the platform."
            features={[
              "Emotional archetype discovery",
              "Resonance Score & match band",
              "Blurred profile experience",
              "Voice prompts",
              "Limited daily introductions",
              "Basic compatibility insights",
            ]}
            cta="Start free"
            ctaTo="/onboarding"
          />

          {/* SYNAPSE+ */}
          <Tier
            highlight
            badge="SYNAPSE+"
            icon={<Sparkles className="h-5 w-5" />}
            price="$24"
            cadence="/ month"
            blurb="The full emotional intelligence layer. For people serious about connection."
            features={[
              "Unlimited compatibility discoveries",
              "Advanced AI relationship insights",
              "Emotional synchronization analysis",
              "Compatibility evolution timeline",
              "Voice chemistry intelligence",
              "Deeper archetype analysis",
              "Premium profile aura customization",
              "Priority compatibility visibility",
            ]}
            cta="Unlock SYNAPSE+"
            ctaTo="/onboarding"
          />

          {/* BLACK */}
          <Tier
            black
            badge="SYNAPSE Black"
            icon={<Crown className="h-5 w-5" />}
            price="$79–149"
            cadence="/ month"
            blurb="A private, elite tier for intentional professionals."
            features={[
              "Concierge-level AI matching",
              "Elite compatibility filtering",
              "Private curated introductions",
              "Behavioral authenticity analysis",
              "High-trust member circles",
              "Premium verification",
              "Enhanced privacy controls",
              "Early access to experimental tools",
            ]}
            cta="Request access"
            ctaTo="/onboarding"
          />
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-muted-foreground">
          No casino mechanics. No urgency pop-ups. No manipulative upgrades.
          Premium is an invitation, not a wall.
        </p>
      </section>
    </div>
  );
}

function Tier({
  badge, icon, price, cadence, blurb, features, cta, ctaTo,
  highlight = false, black = false,
}: {
  badge: string; icon: React.ReactNode; price: string; cadence: string;
  blurb: string; features: string[]; cta: string; ctaTo: string;
  highlight?: boolean; black?: boolean;
}) {
  const border = black
    ? "border-foreground/20 bg-[oklch(0.09_0.01_280)]"
    : highlight
      ? "border-primary bg-card shadow-glow"
      : "border-border bg-card";
  return (
    <div className={`relative flex flex-col rounded-3xl border p-8 ${border}`}>
      {highlight && (
        <div className="absolute -top-3 left-8 rounded-full bg-gradient-hero px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground shadow-glow">
          Most chosen
        </div>
      )}
      {black && (
        <div className="absolute -top-3 left-8 rounded-full border border-foreground/30 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground">
          Invite tier
        </div>
      )}
      <div className="mb-5 flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${black ? "bg-foreground text-background" : "bg-gradient-hero text-primary-foreground"}`}>
          {icon}
        </span>
        <div className="font-display text-xl font-bold">{badge}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${black ? "text-foreground" : "text-neon"}`} />
            <span className="text-foreground/85">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaTo}
        className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-transform hover:scale-[1.02] ${
          black
            ? "bg-foreground text-background"
            : highlight
              ? "bg-gradient-hero text-primary-foreground shadow-glow"
              : "border border-border bg-surface text-foreground hover:bg-surface-2"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
