import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoMark, LogoWordmark } from "@/components/LogoHeader";
import { Mic, MessageCircleHeart, ShieldCheck, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to UNVEIL" },
      { name: "description", content: "Connection begins beneath the surface. Voice before appearance. Reveal through conversation." },
      { property: "og:title", content: "Welcome to UNVEIL" },
      { property: "og:description", content: "Voice before appearance. Reveal through conversation. Built for intentional dating." },
    ],
  }),
  component: Welcome,
});

const SEEN_KEY = "unveil:welcome:seen";

type Slide = {
  eyebrow: string;
  title: string;
  italic: string;
  body: string;
  bullets: { icon: React.ReactNode; label: string }[];
  Icon: React.ComponentType<{ className?: string }>;
};

const slides: Slide[] = [
  {
    eyebrow: "Chapter One",
    title: "Connection before",
    italic: "appearance.",
    body: "Meet people beyond first impressions. Voice and presence before photos.",
    bullets: [
      { icon: <Mic className="h-3.5 w-3.5" />, label: "Voice before photo" },
      { icon: <Check className="h-3.5 w-3.5" />, label: "Meaningful conversations first" },
      { icon: <Check className="h-3.5 w-3.5" />, label: "Move beyond the swipe" },
    ],
    Icon: Mic,
  },
  {
    eyebrow: "Chapter Two",
    title: "Reveal through",
    italic: "conversation.",
    body: "Photos unlock after meaningful interaction — ten exchanges including a voice note. Build trust before the veil lifts.",
    bullets: [
      { icon: <Check className="h-3.5 w-3.5" />, label: "10 messages to unlock" },
      { icon: <Mic className="h-3.5 w-3.5" />, label: "At least one voice note" },
      { icon: <Check className="h-3.5 w-3.5" />, label: "Reveal celebrated, once" },
    ],
    Icon: MessageCircleHeart,
  },
  {
    eyebrow: "Chapter Three",
    title: "Safer, smarter",
    italic: "dating.",
    body: "Selfie-verified profiles, AI compatibility insights, and contact details that stay private until both of you choose to share.",
    bullets: [
      { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Verified profiles only" },
      { icon: <Check className="h-3.5 w-3.5" />, label: "AI compatibility insights" },
      { icon: <Check className="h-3.5 w-3.5" />, label: "Private contact exchange" },
    ],
    Icon: ShieldCheck,
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const slide = slides[i];
  const last = i === slides.length - 1;

  useEffect(() => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }, []);

  const finish = (to: "/signup" | "/login") => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    navigate({ to });
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full opacity-60 blur-[120px]"
             style={{ background: "var(--gradient-aura)" }} />
        <div className="absolute -bottom-32 -right-24 h-[460px] w-[460px] rounded-full opacity-50 blur-[140px]"
             style={{ background: "var(--gradient-logo)" }} />
        <div className="absolute inset-0" style={{ background: "var(--gradient-deep)", opacity: 0.55 }} />
      </div>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),18px)]">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark size={28} glow="soft" />
          <LogoWordmark size={14} />
        </Link>
        <button
          onClick={() => finish("/login")}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Skip
        </button>
      </header>

      {/* Slide */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-4">
        <div key={i} className="flex w-full max-w-md flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Icon medallion */}
          <div className="relative mb-10">
            <div className="absolute inset-0 -m-6 rounded-full opacity-70 blur-2xl"
                 style={{ background: "var(--gradient-logo)" }} />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur">
              <slide.Icon className="h-12 w-12 text-foreground" />
            </div>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {slide.eyebrow}
          </div>
          <h1 className="mt-3 font-display text-4xl font-light leading-[1.05] sm:text-5xl">
            {slide.title}
            <br />
            <span className="text-gradient-aura italic">{slide.italic}</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            {slide.body}
          </p>

          <ul className="mt-7 w-full max-w-xs space-y-2.5">
            {slide.bullets.map((b, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-full border border-border bg-card/50 px-4 py-2.5 text-left text-sm backdrop-blur">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
                  {b.icon}
                </span>
                <span className="text-foreground/90">{b.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer: dots + actions */}
      <footer className="px-6 pb-[max(env(safe-area-inset-bottom),22px)]">
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-8 bg-gradient-hero" : "w-1.5 bg-border hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <div className="flex w-full flex-col gap-2.5">
            {last ? (
              <>
                <button
                  onClick={() => finish("/signup")}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => finish("/login")}
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface/60 px-7 py-3.5 font-medium hover:bg-surface"
                >
                  I already have an account
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setI(i + 1)}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  Next
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => finish("/signup")}
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface/60 px-7 py-3.5 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  Create Profile
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
