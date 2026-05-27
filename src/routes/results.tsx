import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SynapseNav } from "@/components/SynapseNav";
import { ARCHETYPES, useProfile } from "@/lib/synapse-store";
import { Avatar } from "@/components/Avatar";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Your Signature — SYNAPSE" }, { name: "description", content: "Your emotional archetype and resonance signature." }] }),
  component: Results,
});

function Results() {
  const navigate = useNavigate();
  const [profile] = useProfile();

  useEffect(() => {
    if (profile === null) {
      const t = setTimeout(() => {
        if (!localStorage.getItem("synapse-profile-v1")) navigate({ to: "/onboarding" });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [profile, navigate]);

  if (!profile) {
    return (
      <div className="min-h-screen">
        <SynapseNav />
        <div className="p-12 text-center text-muted-foreground">Composing your signature…</div>
      </div>
    );
  }

  const archetype = ARCHETYPES[profile.archetype];
  const charAvg = Math.round(
    (profile.character.warmth + profile.character.curiosity + profile.character.adventure +
      profile.character.loyalty + profile.character.humor + profile.character.ambition) / 6
  );

  return (
    <div className="min-h-screen">
      <SynapseNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Your signature</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Hello, {profile.name}.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            This is how you show up. It will evolve with every meaningful exchange.
          </p>
        </div>

        {/* ARCHETYPE CARD */}
        <div className="relative mb-4 overflow-hidden rounded-3xl border border-border bg-card p-8">
          <div
            className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl opacity-40"
            style={{ background: archetype.hue }}
          />
          <div className="relative flex flex-wrap items-start gap-6">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-accent" /> Emotional archetype
            </div>
          </div>
          <div className="relative mt-4">
            <h2 className="font-display text-5xl font-bold text-gradient-hero md:text-6xl">{archetype.name}</h2>
            <p className="mt-3 max-w-xl text-lg italic text-foreground/85">"{archetype.tagline}"</p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{archetype.essence}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-3xl border border-border bg-card p-8">
            <div className="flex items-center gap-6">
              <Avatar seed={profile.avatar ?? "me-180"} size={88} label={profile.name} />
              <div>
                <div className="font-display text-2xl font-bold">{profile.name}, {profile.age}</div>
                <div className="text-sm text-muted-foreground">{profile.city} · {profile.professionLabel}</div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <Metric label="Cognitive rhythm" value={profile.mindScore} grad="bg-gradient-mind" />
              <Metric label="Sensory layer" value={profile.faceHarmony} grad="bg-gradient-face" />
              <Metric label="Emotional DNA" value={charAvg} grad="bg-gradient-soul" />
            </div>
          </div>

          <div className="rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <div className="font-mono text-xs uppercase tracking-wider opacity-80">Resonance</div>
            <div className="mt-4 font-display text-7xl font-bold leading-none">{profile.composite}</div>
            <div className="mt-3 text-sm opacity-90">
              Your compatibility band:{" "}
              <span className="font-mono font-bold">{Math.max(0, profile.composite - 5)} – {Math.min(99, profile.composite + 5)}</span>
            </div>
            <div className="mt-4 text-xs opacity-80">
              Not a rank. A frequency.
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-4 font-display text-xl font-bold">Emotional DNA</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(profile.character).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-mono uppercase text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-gradient-hero" style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/matches"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Meet your band <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-4 text-sm hover:bg-surface-2"
          >
            Explore SYNAPSE+
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, grad }: { label: string; value: number; grad: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-2xl ${grad}`} />
      <div className="relative">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
}
