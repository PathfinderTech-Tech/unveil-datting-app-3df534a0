import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { LogoMark } from "@/components/LogoHeader";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Eye, MessageCircle, Heart, Waves, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNVEIL — Connection Starts Beneath the Surface" },
      { name: "description", content: "Compatibility-first dating platform where meaningful connections form before appearance becomes central." },
      { property: "og:title", content: "UNVEIL — Connection Starts Beneath the Surface" },
      { property: "og:description", content: "Compatibility-first dating platform where meaningful connections form before appearance becomes central." },
      { property: "og:url", content: "https://unveil.best/" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/" }],
  }),
  component: Home,
});

function Home() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState("");

  const joinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.from("waitlist").insert({ email, source: "landing" });
    if (error) setErr(error.message);
    else setJoined(true);
  };

  return (
    <div className="min-h-screen">
      <UnveilNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <div className="mb-10 flex justify-center">
            <LogoMark size={140} className="animate-float" />
          </div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Love beyond the surface
          </div>
          <h1 className="font-display text-5xl font-light leading-[1.05] md:text-7xl">
            Connection starts
            <br />
            <span className="text-gradient-hero italic">beneath the surface.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
            UNVEIL is an intentional connection platform where compatibility unfolds through
            curiosity, emotional rhythm, and meaningful interaction — before appearance
            becomes central.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Discover Yourself <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-7 py-3.5 font-medium hover:bg-surface"
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </section>

      {/* PROGRESSIVE REVEAL */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <div className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">The Reveal</div>
          <h2 className="mt-3 font-display text-4xl font-light md:text-5xl">
            What unfolds <span className="text-gradient-aura italic">is earned</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Photos blur. Voices speak first. Profiles reveal as mutual curiosity grows.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <StageCard n="01" icon={<Eye className="h-5 w-5" />} title="Curiosity" desc="Archetype, voice prompt, emotional rhythm. Photos remain veiled." />
          <StageCard n="02" icon={<MessageCircle className="h-5 w-5" />} title="Warmth" desc="Mutual conversation softens the veil. Deeper insights unlock." />
          <StageCard n="03" icon={<Heart className="h-5 w-5" />} title="Presence" desc="Sustained interest opens full profile and intentional meetup tools." />
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-border bg-gradient-deep p-10 text-center md:p-14">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-accent" />
          <h2 className="font-display text-3xl font-light md:text-4xl">
            Be present when we open.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Early members receive priority verification and a permanent founding-circle archetype.
          </p>
          {joined ? (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-3 text-sm">
              <Heart className="h-4 w-4 text-accent" /> You're on the list.
            </div>
          ) : (
            <form onSubmit={joinWaitlist} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full max-w-xs rounded-full border border-border bg-surface px-5 py-3 text-sm outline-none focus:border-primary"
              />
              <button className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
                Join waitlist
              </button>
            </form>
          )}
          {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-3.5 w-3.5" />
            UNVEIL · unveil.best
          </div>
          <div className="flex flex-wrap gap-5">
            <Link to="/terms">Terms</Link>
            <Link to="/terms">Privacy</Link>
            <Link to="/safety">Safety</Link>
            <a href="mailto:support@unveil.best">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StageCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 transition-all hover:border-primary/40 hover:shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground">{icon}</div>
        <div className="font-mono text-xs tracking-luxury text-muted-foreground">STAGE {n}</div>
      </div>
      <h3 className="font-display text-2xl font-light">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
