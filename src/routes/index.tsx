import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { LogoMark } from "@/components/LogoHeader";
import { HomeDashboard } from "@/components/HomeDashboard";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Eye, MessageCircle, Heart, Waves } from "lucide-react";

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
  const { user, loading } = useAuth();
  if (user && !loading) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <HomeDashboard user={user} />
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <UnveilNav />


      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 text-center md:px-6 md:pt-20 md:pb-24">
          <div className="mb-8 flex justify-center md:mb-10">
            <LogoMark size={120} className="animate-float md:!w-[140px] md:!h-[140px]" />
          </div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Available Now on Web · iOS App Coming Soon
          </div>
          <h1 className="font-display text-4xl font-light leading-[1.05] sm:text-5xl md:text-7xl">
            Connection begins
            <br />
            <span className="text-gradient-hero italic">beneath the surface.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:mt-8 md:text-lg">
            Voice before appearance. Compatibility before matches.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 md:mt-10">
            <Link to="/signup" className="group inline-flex items-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
              Create Your Profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/discover" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-7 py-3.5 font-medium hover:bg-surface">
              Discover Yourself
            </Link>
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

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-3.5 w-3.5" />
            UNVEIL · unveil.best
          </div>
          <div className="flex flex-wrap gap-5">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/safety">Safety</Link>
            <Link to="/contact">Contact</Link>
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
