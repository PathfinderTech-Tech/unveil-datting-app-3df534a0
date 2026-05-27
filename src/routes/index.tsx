import { createFileRoute, Link } from "@tanstack/react-router";
import { SynapseNav } from "@/components/SynapseNav";
import { Brain, Sparkles, Activity, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SYNAPSE — Dating, decided by your mind" },
      { name: "description", content: "A 60-second neuro-game scores your cognition. Get matched with people whose Mind Score is within 5 points of yours." },
      { property: "og:title", content: "SYNAPSE — Love at first thought" },
      { property: "og:description", content: "Cognitive ELO meets Face Harmony meets Character DNA. The dating app no one has built." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SynapseNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
            World's first cognitive dating engine
          </div>
          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
            Love at first
            <br />
            <span className="text-gradient-hero">thought.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Forget swiping selfies. SYNAPSE scores how you <em>think</em> through a 60-second neuro-game,
            then matches you with people whose Mind Score, Face Harmony, and Character DNA are within ±5 points of yours.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Take the test <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/matches"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 font-medium hover:bg-surface"
            >
              See the feed
            </Link>
          </div>

          {/* floating score card */}
          <div className="mt-20 grid gap-6 md:grid-cols-3">
            <StatCard icon={<Brain className="h-5 w-5" />} label="Mind Score" value="0–100" sub="60s logic, memory, pattern, intuition" grad="bg-gradient-mind" />
            <StatCard icon={<Sparkles className="h-5 w-5" />} label="Face Harmony" value="%" sub="Symmetry × expressiveness" grad="bg-gradient-face" />
            <StatCard icon={<Activity className="h-5 w-5" />} label="Character DNA" value="6 axes" sub="Warmth, curiosity, ambition…" grad="bg-gradient-soul" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-16 flex items-end justify-between">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Four signals.<br />
            <span className="text-muted-foreground">One composite score.</span>
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            We compute an ELO-like Composite. You're matched with people within a 10-point band — calibrated for genuine compatibility, not novelty.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <div className="mb-4 font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.color }}>
                {s.icon}
              </div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* THE BIG PROMISE */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-12 md:p-20">
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="relative max-w-2xl">
            <Zap className="mb-6 h-10 w-10 text-primary-foreground" />
            <h2 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
              The first app where your IQ is your dating profile.
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/80">
              Photos are optional. Bios are optional. Your mind is the headline.
            </p>
            <Link
              to="/onboarding"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-medium text-foreground transition-transform hover:scale-105"
            >
              Start your assessment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center text-xs text-muted-foreground">
        SYNAPSE · prototype · built on Lovable
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, sub, grad }: { icon: React.ReactNode; label: string; value: string; sub: string; grad: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-1">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl ${grad}`} />
      <div className="relative">
        <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground">{icon}</div>
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-3xl font-bold">{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Face Harmony", desc: "Upload a selfie. We analyze symmetry, golden ratios, and expressiveness — never used for ranking, only for compatibility.", color: "var(--gradient-face)", icon: <Sparkles className="h-5 w-5 text-primary-foreground" /> },
  { title: "Profession Axis", desc: "Pick your work archetype: analytical, creative, caregiving, entrepreneurial, craft, or academic.", color: "var(--surface-2)", icon: <Zap className="h-5 w-5 text-foreground" /> },
  { title: "Mind Game", desc: "60 seconds. Four rounds: logic puzzle, memory recall, pattern detection, and intuition speed.", color: "var(--gradient-mind)", icon: <Brain className="h-5 w-5 text-primary-foreground" /> },
  { title: "Character DNA", desc: "Six rapid sliders. We blend it all into your Composite — and find your ±5 band.", color: "var(--gradient-soul)", icon: <Activity className="h-5 w-5 text-primary-foreground" /> },
];
