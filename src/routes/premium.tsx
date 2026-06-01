import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Check, Sparkles, Crown, Heart } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({ meta: [{ title: "Premium — UNVEIL" }] }),
  component: Premium,
});

type Plan = "1" | "3" | "6" | "9" | "12";
const PLUS: Record<Plan, string> = { "1": "$19.99", "3": "$49.99", "6": "$89.99", "9": "$119.99", "12": "$149.99" };
const BLACK: Partial<Record<Plan, string>> = { "1": "$49.99", "3": "$129.99", "6": "$239.99", "12": "$399.99" };

function Premium() {
  const [plan, setPlan] = useState<Plan>("3");
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Membership</p>
          <h1 className="mt-4 font-display text-5xl font-light md:text-6xl">
            Pay for <span className="text-gradient-aura italic">clarity</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            You are not paying for access to people. You are paying for emotional clarity and intentional connection.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            {(["1","3","6","9","12"] as Plan[]).map((p) => (
              <button key={p} onClick={() => setPlan(p)}
                className={`rounded-full px-4 py-2 text-xs transition-colors ${plan === p ? "bg-gradient-hero text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                {p} {p === "1" ? "month" : "months"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Tier icon={<Heart className="h-5 w-5" />} badge="Free" price="$0" cadence="forever"
            blurb="Discover your archetype and feel the platform."
            features={[
              "Basic profile",
              "Limited curated matches",
              "Limited challenges",
              "Spark Questions feed",
              "Discovery Puzzles",
            ]}
            cta="Start free" />

          <Tier highlight icon={<Sparkles className="h-5 w-5" />} badge="UNVEIL+" price={PLUS[plan]} cadence={`/ ${plan === "1" ? "month" : `${plan} months`}`}
            blurb="The full emotional intelligence layer."
            features={[
              "Unlimited matches & challenges",
              "Full Chemistry Meter insights",
              "All Spark Questions categories",
              "Couple Challenge Mode",
              "Voice prompts & gradual reveals",
              "Profile aura customization",
            ]}
            cta="Unlock UNVEIL+" />

          <Tier black icon={<Crown className="h-5 w-5" />} badge="UNVEIL Black"
            price={BLACK[plan] ?? "—"} cadence={BLACK[plan] ? `/ ${plan === "1" ? "month" : `${plan} months`}` : "not available at this term"}
            blurb="A private, elite tier for the most intentional members."
            features={[
              "Everything in UNVEIL+",
              "Private curated introductions",
              "Premium identity & trust verification",
              "First Date Simulator priority",
              "Concierge date planning",
              "Enhanced privacy controls",
            ]}
            cta="Request access" />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All subscriptions are non-refundable except where required by law. No casino mechanics. No urgency pop-ups.
        </p>
      </section>
    </div>
  );
}

function Tier({ icon, badge, price, cadence, blurb, features, cta, highlight, black }: {
  icon: React.ReactNode; badge: string; price: string; cadence: string; blurb: string; features: string[]; cta: string;
  highlight?: boolean; black?: boolean;
}) {
  const border = black ? "border-foreground/20 bg-[oklch(0.06_0.02_295)]" : highlight ? "border-primary bg-card shadow-glow" : "border-border bg-card";
  return (
    <div className={`relative flex flex-col rounded-3xl border p-8 ${border}`}>
      {highlight && <div className="absolute -top-3 left-8 rounded-full bg-gradient-hero px-3 py-1 font-mono text-[10px] uppercase tracking-luxury text-primary-foreground shadow-glow">Most chosen</div>}
      {black && <div className="absolute -top-3 left-8 rounded-full border border-foreground/30 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-luxury">Invite tier</div>}
      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">{icon}</div>
      <div className="font-display text-xl font-light">{badge}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" /><span className="text-foreground/85">{f}</span></li>
        ))}
      </ul>
      <Link to="/signup" className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium ${black ? "bg-foreground text-background" : highlight ? "bg-gradient-hero text-primary-foreground shadow-glow" : "border border-border bg-surface hover:bg-surface-2"}`}>{cta}</Link>
    </div>
  );
}
