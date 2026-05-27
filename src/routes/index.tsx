import { createFileRoute, Link } from "@tanstack/react-router";
import { SynapseNav } from "@/components/SynapseNav";
import { Brain, Sparkles, Activity, Waves, ArrowRight, Eye, MessageCircle, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SYNAPSE — Where minds connect first" },
      { name: "description", content: "A cognitive & emotional compatibility platform. Not swipes — resonance. Match through thinking style, curiosity, and emotional rhythm." },
      { property: "og:title", content: "SYNAPSE — Love at first thought" },
      { property: "og:description", content: "Compatibility beyond appearance. Built for deeper connection." },
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
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
            A new way to experience connection in the AI era
          </div>
          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
            Love at first
            <br />
            <span className="text-gradient-hero">thought.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            SYNAPSE matches people through compatible thinking styles, emotional rhythms,
            and curiosity — not selfies and snap judgements. Your mind is part of the attraction.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Discover your resonance <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/matches"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 font-medium hover:bg-surface"
            >
              See the feed
            </Link>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-3">
            <StatCard icon={<Brain className="h-5 w-5" />} label="Cognitive rhythm" value="Your signature" sub="How you think, not how high you score" grad="bg-gradient-mind" />
            <StatCard icon={<Sparkles className="h-5 w-5" />} label="Emotional archetype" value="7 patterns" sub="The Architect, the Mirror, the Catalyst…" grad="bg-gradient-face" />
            <StatCard icon={<Waves className="h-5 w-5" />} label="Resonance band" value="±5 points" sub="Calibrated for genuine compatibility" grad="bg-gradient-soul" />
          </div>
        </div>
      </section>

      {/* WHAT WE'RE NOT */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-border bg-surface/40 p-10 md:p-14">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Our thesis</div>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
                Most apps optimize for instant attraction.<br/>
                <span className="text-gradient-hero">We optimize for resonance.</span>
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><span className="text-neon">+</span> Connection starts beneath the surface.</li>
              <li className="flex gap-3"><span className="text-neon">+</span> Compatibility beyond appearance.</li>
              <li className="flex gap-3"><span className="text-neon">+</span> No leaderboards. No ranking. No social hierarchy.</li>
              <li className="flex gap-3"><span className="text-neon">+</span> Emotional pacing replaces endless swiping.</li>
              <li className="flex gap-3"><span className="text-neon">+</span> Profiles reveal as chemistry earns the reveal.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Four signals.<br />
            <span className="text-muted-foreground">One resonance.</span>
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            We compute a Resonance Score from thinking style, emotional dynamics, and sensory
            layers — and surface only the people inside your compatibility band.
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

      {/* PROGRESSIVE REVEAL */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Progressive unlocking</div>
          <h2 className="mt-2 font-display text-4xl font-bold md:text-5xl">
            The reveal is <span className="text-gradient-hero">earned</span>, never timed.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            No 7-day countdown. Photos clear, prompts deepen, and meetup tools appear
            as mutual engagement signals real chemistry.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StageCard n="01" icon={<Eye className="h-5 w-5"/>} title="Blurred & curious" desc="Voice prompts, text rhythm, archetype glimpses. No photos yet." />
          <StageCard n="02" icon={<MessageCircle className="h-5 w-5"/>} title="Earned warmth" desc="Reciprocal replies and voice notes gradually unblur the visual layer." />
          <StageCard n="03" icon={<Heart className="h-5 w-5"/>} title="Intentional meetup" desc="Sustained resonance opens full profile and a mutual meetup tool." />
        </div>
      </section>

      {/* PROMISE */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-12 md:p-20">
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="relative max-w-2xl">
            <Activity className="mb-6 h-10 w-10 text-primary-foreground" />
            <h2 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
              Where minds connect first.
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/85">
              Your archetype, your rhythm, your curiosity — surfaced with care. The rest unfolds
              when both of you lean in.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-medium text-foreground transition-transform hover:scale-105"
              >
                Begin your signature <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-transparent px-6 py-3 font-medium text-primary-foreground hover:bg-primary-foreground/10"
              >
                See SYNAPSE+ & Black
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center text-xs text-muted-foreground">
        SYNAPSE · an emotional intelligence ecosystem · prototype
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, sub, grad }: { icon: React.ReactNode; label: string; value: string; sub: string; grad: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-1">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-2xl ${grad}`} />
      <div className="relative">
        <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground">{icon}</div>
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function StageCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-foreground">{icon}</div>
        <div className="font-mono text-xs text-muted-foreground">Stage {n}</div>
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

const STEPS = [
  { title: "Sensory layer", desc: "A selfie reveals harmony cues. Used for compatibility — never ranking, never visible without consent.", color: "var(--gradient-face)", icon: <Sparkles className="h-5 w-5 text-primary-foreground" /> },
  { title: "Profession axis", desc: "How you spend your hours — analytical, creative, caregiving, entrepreneurial, craft, academic.", color: "var(--surface-2)", icon: <Activity className="h-5 w-5 text-foreground" /> },
  { title: "Cognitive rhythm", desc: "A short, playful session reveals your thinking style. Not a test. There are no wrong answers.", color: "var(--gradient-mind)", icon: <Brain className="h-5 w-5 text-primary-foreground" /> },
  { title: "Character dynamics", desc: "Six emotional sliders. We blend it all into your Resonance Score and your archetype.", color: "var(--gradient-soul)", icon: <Waves className="h-5 w-5 text-primary-foreground" /> },
];
