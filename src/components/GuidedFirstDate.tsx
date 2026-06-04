import { useState } from "react";
import { Coffee, Clock, MessageCircle, Heart, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const STEPS = [
  {
    icon: Clock,
    title: "Before · 24 hours out",
    items: [
      "Send one small confirmation — time, place, mood.",
      "Look up the place so you're not navigating in awkward silence.",
      "Pick one question you actually want to ask.",
    ],
  },
  {
    icon: Coffee,
    title: "Arriving",
    items: [
      "Get there 5 minutes early. Breathe.",
      "Lead with what you noticed in their profile — specific, not flattering.",
      "Order quickly so it stops being a logistics conversation.",
    ],
  },
  {
    icon: MessageCircle,
    title: "Mid-date prompts",
    items: [
      "What surprised you most this week?",
      "What's something you've been quietly proud of?",
      "What does a good Sunday look like for you?",
    ],
  },
  {
    icon: Heart,
    title: "After",
    items: [
      "Within 12 hours: send one honest line. No emoji-only messages.",
      "Name something specific you liked.",
      "If a second date — propose a time, not just 'soon'.",
    ],
  },
];

export function GuidedFirstDate() {
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        trackEvent("guided_date_step_completed", { step: key });
      }
      return next;
    });
  }

  const total = STEPS.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Guided First Date</div>
          <h3 className="mt-1 font-display text-xl font-light">A gentle script for the real-world part.</h3>
        </div>
        <div className="text-right text-xs text-muted-foreground">{done.size}/{total}</div>
      </div>

      <div className="mt-5 space-y-5">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-primary" /> {s.title}
              </div>
              <ul className="mt-2 space-y-1.5 pl-6">
                {s.items.map((item) => {
                  const key = `${s.title}::${item}`;
                  const isDone = done.has(key);
                  return (
                    <li key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${isDone ? "text-muted-foreground line-through" : "hover:bg-surface/50"}`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${isDone ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {isDone && <Check className="h-3 w-3" />}
                        </span>
                        <span>{item}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
