import { Globe2, Users, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Aggregate, anonymized rhythm of the 7-Day Contact Exchange Journey.
// Photos are visible from Day 1; these milestones are conversation rapport
// signals, NOT photo-reveal stages. The final stop is the contact-exchange
// unlock at Day 7.
const STOPS = [
  { day: 1, label: "First spark", share: 100 },
  { day: 2, label: "Voice arrives", share: 78 },
  { day: 3, label: "Values shared", share: 62 },
  { day: 4, label: "Communication map", share: 48 },
  { day: 5, label: "Future goals", share: 36 },
  { day: 6, label: "Shared question", share: 25 },
  { day: 7, label: "Contact exchange unlocked", share: 14 },
];

const CITIES = [
  "Lisbon", "Berlin", "Tokyo", "Mexico City", "Cape Town", "Brooklyn",
  "Paris", "Buenos Aires", "Seoul", "Stockholm", "Marrakesh", "Sydney",
];

/**
 * Global Passport Journeys — anonymized rhythm view of the
 * 7-Day Contact Exchange Journey across UNVEIL.
 */
export function GlobalPassportJourneys() {
  useEffect(() => {
    trackEvent("journeys_viewed");
  }, []);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
            <Globe2 className="h-3.5 w-3.5" /> Global Passport Journeys
          </div>
          <h2 className="mt-2 font-display text-2xl font-light md:text-3xl">
            How connections unfold across the world.
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            A live rhythm of how UNVEIL connections unfold across cities — anonymous, aggregate, gentle.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> Active journeys
          </div>
          <div className="mt-0.5 font-display text-2xl">2,418</div>
        </div>
      </div>

      <ol className="relative mt-6 space-y-3">
        {STOPS.map((s) => (
          <li key={s.day}>
            <button
              type="button"
              onClick={() => trackEvent("journey_stop_clicked", { day: s.day, label: s.label })}
              className="flex w-full items-center gap-4 rounded-xl px-1 py-1 text-left transition hover:bg-surface/50"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-xs text-primary">
                {s.day}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.share}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/60">
                  <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${s.share}%` }} />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        {CITIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => trackEvent("journey_city_clicked", { city: c })}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Sparkles className="h-3 w-3 text-accent" /> {c}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[11px] italic text-muted-foreground">
        Aggregate cohort rhythm across UNVEIL. No individual journey is identifiable.
      </p>
    </section>
  );
}
