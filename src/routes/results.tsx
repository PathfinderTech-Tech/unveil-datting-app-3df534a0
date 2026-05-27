import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SynapseNav } from "@/components/SynapseNav";
import { useProfile } from "@/lib/synapse-store";
import { Avatar } from "@/components/Avatar";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Your Score — SYNAPSE" }, { name: "description", content: "Your cognitive dating signature." }] }),
  component: Results,
});

function Results() {
  const navigate = useNavigate();
  const [profile] = useProfile();

  useEffect(() => {
    if (profile === null) {
      // give the store a tick before redirecting
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
        <div className="p-12 text-center text-muted-foreground">Loading your signature…</div>
      </div>
    );
  }

  const charAvg = Math.round(
    (profile.character.warmth + profile.character.curiosity + profile.character.adventure +
      profile.character.loyalty + profile.character.humor + profile.character.ambition) / 6
  );

  return (
    <div className="min-h-screen">
      <SynapseNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Composite signature</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Meet {profile.name}.</h1>
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
              <Metric label="Mind" value={profile.mindScore} grad="bg-gradient-mind" />
              <Metric label="Face Harmony" value={profile.faceHarmony} grad="bg-gradient-face" />
              <Metric label="Character" value={charAvg} grad="bg-gradient-soul" />
            </div>
          </div>

          <div className="rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <div className="font-mono text-xs uppercase tracking-wider opacity-80">Composite</div>
            <div className="mt-4 font-display text-7xl font-bold leading-none">{profile.composite}</div>
            <div className="mt-3 text-sm opacity-90">
              Your match band: <span className="font-mono font-bold">{Math.max(0, profile.composite - 5)} – {Math.min(99, profile.composite + 5)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-8">
          <h3 className="mb-4 font-display text-xl font-bold">Character DNA</h3>
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

        <div className="mt-10 flex justify-center">
          <Link
            to="/matches"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            See your matches <ArrowRight className="h-4 w-4" />
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
