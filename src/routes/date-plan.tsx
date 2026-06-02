import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SafetyReminder } from "@/components/SafetyReminder";
import { Coffee, Utensils, BookOpen, Mountain, Image, Trees, Check, Wallet } from "lucide-react";

export const Route = createFileRoute("/date-plan")({
  head: () => ({
    meta: [
      { title: "Plan Your Date — UNVEIL" },
      { name: "description", content: "Pick a theme, venue, and how you'd like to split the bill — together." },
    ],
  }),
  component: DatePlan,
});

const THEMES = [
  { id: "coffee", label: "Coffee Date", icon: Coffee, hint: "Quiet café, real talk." },
  { id: "dinner", label: "Dinner Date", icon: Utensils, hint: "Slow plates, longer stories." },
  { id: "museum", label: "Museum Date", icon: Image, hint: "Wander, react, debate." },
  { id: "bookstore", label: "Bookstore Date", icon: BookOpen, hint: "Pick a book for each other." },
  { id: "adventure", label: "Adventure Date", icon: Mountain, hint: "Move, sweat, laugh." },
  { id: "picnic", label: "Picnic Date", icon: Trees, hint: "Outdoors, blanket, simple." },
];

const PAYMENTS = [
  { id: "split", label: "Split the bill" },
  { id: "winner", label: "Challenge winner pays" },
  { id: "loser", label: "Challenge loser pays" },
  { id: "alternate", label: "Alternate dates" },
  { id: "together", label: "Decide together" },
];

function DatePlan() {
  const [theme, setTheme] = useState<string | null>(null);
  const [venue, setVenue] = useState("");
  const [activity, setActivity] = useState("");
  const [payment, setPayment] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Date Planning</div>
          <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">
            Design the <span className="italic text-gradient-hero">first chapter</span> together.
          </h1>
          <p className="mt-3 text-muted-foreground">Pick a theme, suggest a place, and agree on how to handle the bill.</p>
        </div>

        <SafetyReminder compact />

        {/* Theme */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-3 font-display text-xl">Theme</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                    active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface/40 hover:border-foreground/30"
                  }`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="font-display text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Venue & activity */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <label className="font-display text-sm">Venue suggestion</label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="A specific place, neighborhood, or area"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <label className="font-display text-sm">Activity twist</label>
            <input value={activity} onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. bring your favorite book"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
        </section>

        {/* Payment */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2 font-display text-xl">
            <Wallet className="h-4 w-4 text-primary" /> How to handle the bill
          </div>
          <p className="text-xs text-muted-foreground">No one is forced to pay. Both of you must agree.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {PAYMENTS.map((p) => {
              const active = payment === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    active ? "border-primary bg-primary/10" : "border-border bg-surface/40 hover:border-foreground/30"
                  }`}
                >
                  <span>{p.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </section>

        <button
          disabled={!theme || !payment || sent}
          onClick={() => setSent(true)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40"
        >
          {sent ? "Sent to your match for approval ✓" : "Send proposal to your match"}
        </button>
      </div>
    </div>
  );
}
