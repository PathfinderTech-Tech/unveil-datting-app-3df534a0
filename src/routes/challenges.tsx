import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { FIRST_DATE_SCENARIOS, WOULD_YOU_RATHER } from "@/lib/synapse-store";
import { Swords, Sparkles, MapPin, Coffee } from "lucide-react";

export const Route = createFileRoute("/challenges")({
  head: () => ({ meta: [{ title: "Challenge Before The Date — UNVEIL" }, { name: "description", content: "Playful challenges to spark chemistry before you meet." }] }),
  component: Challenges,
});

type Tab = "challenge" | "simulator";

const REWARDS = [
  { id: "venue", icon: MapPin, label: "Winner picks the venue" },
  { id: "activity", icon: Coffee, label: "Winner picks the activity" },
  { id: "theme", icon: Sparkles, label: "Winner picks the theme" },
];
const PAYMENT_OPTIONS = [
  "Split the bill",
  "Winner pays",
  "Loser pays",
  "Alternate next time",
  "Decide on the night",
];

function Challenges() {
  const [tab, setTab] = useState<Tab>("challenge");
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Challenge Before The Date</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Play first. Meet second.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Lighthearted, flirty challenges that build chemistry — and a tiny ritual to settle the first date together.
          </p>
        </div>

        <div className="mb-8 inline-flex rounded-full border border-border bg-card p-1">
          {(["challenge", "simulator"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${tab === t ? "bg-gradient-hero text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "challenge" ? "Duel" : "First-date simulator"}
            </button>
          ))}
        </div>

        {tab === "challenge" ? <ChallengeFlow /> : <SimulatorFlow />}
      </div>
    </div>
  );
}

function ChallengeFlow() {
  const items = WOULD_YOU_RATHER.slice(0, 3);
  const [picks, setPicks] = useState<("a" | "b" | null)[]>([null, null, null]);
  const [reward, setReward] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>(null);
  const [bothAgree, setBothAgree] = useState(false);
  const allPicked = picks.every(Boolean);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-4 w-4 text-accent" />
          <span className="font-display text-lg font-bold">Rapid-fire round</span>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 font-mono text-xs text-muted-foreground">Question {i + 1}</div>
              <div className="grid gap-2 md:grid-cols-2">
                {(["a", "b"] as const).map((opt) => {
                  const active = picks[i] === opt;
                  return (
                    <button key={opt}
                      onClick={() => setPicks(picks.map((p, j) => (j === i ? opt : p)))}
                      className={`rounded-xl border p-3 text-left text-sm transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"}`}>
                      {opt === "a" ? it.a : it.b}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {allPicked && (
        <>
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-3 font-display text-lg font-bold">Winner's reward</div>
            <div className="grid gap-3 md:grid-cols-3">
              {REWARDS.map((r) => {
                const Icon = r.icon;
                const active = reward === r.id;
                return (
                  <button key={r.id} onClick={() => setReward(r.id)}
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left text-sm transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"}`}>
                    <Icon className="h-5 w-5 text-accent" />
                    <span className="font-display font-bold">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-2 font-display text-lg font-bold">How do you handle the bill?</div>
            <p className="mb-4 text-xs text-muted-foreground">No one is ever required to pay. Both of you must agree before the date.</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((p) => {
                const active = payment === p;
                return (
                  <button key={p} onClick={() => setPayment(p)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-foreground/30"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={bothAgree} onChange={(e) => setBothAgree(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              <span>We both agree to this arrangement.</span>
            </label>
          </div>

          {reward && payment && bothAgree && (
            <div className="rounded-3xl border border-neon/40 bg-neon/5 p-6">
              <div className="font-display text-xl font-bold text-foreground">✨ Challenge locked in.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Winner: <span className="font-medium text-foreground">{REWARDS.find((r) => r.id === reward)!.label.toLowerCase()}</span>. Bill: <span className="font-medium text-foreground">{payment.toLowerCase()}</span>.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SimulatorFlow() {
  const scenarios = useMemo(() => FIRST_DATE_SCENARIOS.slice(0, 4), []);
  const [you, setYou] = useState<(number | null)[]>(Array(scenarios.length).fill(null));
  // Simulated partner answers (in production these'd come from the matched user)
  const them = useMemo(() => scenarios.map(() => Math.floor(Math.random() * 3)), [scenarios]);
  const done = you.every((v) => v !== null);
  const agreement = done ? you.filter((v, i) => v === them[i]).length : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-1 font-display text-lg font-bold">First Date Simulator</div>
        <p className="mb-4 text-sm text-muted-foreground">A few scenarios you'd both face together. See where you click — and where you'll have something to talk about.</p>
        <div className="space-y-5">
          {scenarios.map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-3 font-display">{s.q}</div>
              <div className="grid gap-2">
                {s.options.map((opt, oi) => {
                  const active = you[i] === oi;
                  return (
                    <button key={oi} onClick={() => setYou(you.map((v, j) => (j === i ? oi : v)))}
                      className={`rounded-xl border p-3 text-left text-sm transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <div className="overflow-hidden rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <div className="font-mono text-xs uppercase tracking-wider opacity-80">Simulated chemistry</div>
          <div className="mt-2 font-display text-5xl font-bold">{agreement} / {scenarios.length}</div>
          <p className="mt-2 max-w-xl text-sm opacity-90">
            {agreement >= 3
              ? "You'd glide through a first date — and still have plenty to argue about playfully."
              : agreement === 2
                ? "Enough overlap to feel easy, enough difference to keep it interesting."
                : "Opposites, mostly — could be electric, could be friction. Worth finding out."}
          </p>
          <div className="mt-5 space-y-2 text-sm">
            {scenarios.map((s, i) => {
              const match = you[i] === them[i];
              return (
                <div key={i} className="flex items-start gap-2 rounded-2xl bg-black/15 p-3">
                  <span>{match ? "🟢" : "🟡"}</span>
                  <div>
                    <div className="text-xs opacity-80">{s.q}</div>
                    <div className="opacity-95">You: {s.options[you[i] as number]} · Them: {s.options[them[i]]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
