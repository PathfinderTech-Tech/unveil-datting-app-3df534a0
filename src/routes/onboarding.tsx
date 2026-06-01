import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  PROFESSIONS, DISCOVERY_QUESTIONS, discoveryToCharacter, discoverySummary,
  type DiscoveryProfile, type Profession,
} from "@/lib/synapse-store";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Join UNVEIL" }, { name: "description", content: "A few playful questions to shape your Discovery Profile." }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(28);
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState<Profession | null>(null);
  const [faceUploaded, setFaceUploaded] = useState(false);
  const [faceHarmony, setFaceHarmony] = useState(0);
  const [discovery, setDiscovery] = useState<Partial<DiscoveryProfile>>({});
  const allAnswered = DISCOVERY_QUESTIONS.every((q) => discovery[q.key]);
  const character = allAnswered
    ? discoveryToCharacter(discovery as DiscoveryProfile)
    : { warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50 };

  const simulateFace = () => {
    setFaceUploaded(true);
    // Animated harmony reveal
    let v = 0;
    const target = 72 + Math.floor(Math.random() * 22);
    const tick = setInterval(() => {
      v += 2;
      setFaceHarmony(Math.min(v, target));
      if (v >= target) clearInterval(tick);
    }, 30);
  };

  const finish = async () => {
    const profObj = PROFESSIONS.find((p) => p.id === profession)!;
    const summary = allAnswered ? discoverySummary(discovery as DiscoveryProfile) : "";
    const draft = { name, age, city, profession: profession!, professionLabel: profObj.label, faceHarmony, character, discovery, summary };
    sessionStorage.setItem("unveil-draft", JSON.stringify(draft));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          first_name: name, age, city,
          curiosity_level: character.curiosity,
          emotional_rhythm: character as unknown as Record<string, number>,
          bio: summary || null,
          onboarding_complete: true,
        }).eq("id", user.id);
        await supabase.from("onboarding_answers").upsert({
          user_id: user.id,
          answers: { profession, professionLabel: profObj.label, faceHarmony, character, discovery, summary },
        }, { onConflict: "user_id" });
      }
    } catch (e) { console.warn("[unveil] onboarding save skipped", e); }
    navigate({ to: "/game" });
  };

  const canNext = [
    name.length > 1 && city.length > 1,
    faceUploaded && faceHarmony > 0,
    profession !== null,
    allAnswered,
  ][step];

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* progress */}
        <div className="mb-10 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 01 — Identity</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Who's behind the score?</h1>
            </div>
            <div className="space-y-4">
              <Field label="First name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada" className={inputCls} />
              </Field>
              <Field label="Age">
                <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisbon" className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 02 — Sensory layer</div>
              <h1 className="mt-2 font-display text-4xl font-bold">A glimpse, gently.</h1>
              <p className="mt-2 text-muted-foreground">We read soft harmony cues for compatibility — never for ranking, never visible to others without your consent.</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-border bg-card p-12">
              {!faceUploaded ? (
                <button onClick={simulateFace} className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-face shadow-glow transition-transform hover:scale-105">
                    <Camera className="h-12 w-12 text-primary-foreground" />
                  </div>
                  <span className="font-medium">Tap to capture (demo)</span>
                  <span className="text-xs text-muted-foreground">Prototype simulates analysis</span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-face shadow-glow">
                    <span className="font-display text-4xl font-bold text-primary-foreground">{faceHarmony}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Sensory harmony noted (private)</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 03 — Profession Axis</div>
              <h1 className="mt-2 font-display text-4xl font-bold">How do you spend your hours?</h1>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {PROFESSIONS.map((p) => {
                const active = profession === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProfession(p.id)}
                    className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all ${
                      active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-display font-bold">{p.label}</span>
                    {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 04 — Discovery Profile</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Six quick questions.</h1>
              <p className="mt-2 text-muted-foreground">No right answers. Just pick what sounds more like you.</p>
            </div>
            <div className="space-y-4">
              {DISCOVERY_QUESTIONS.map((q, i) => {
                const picked = discovery[q.key];
                return (
                  <div key={q.key} className="rounded-3xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-base font-medium">{q.prompt}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(["a", "b"] as const).map((opt) => {
                        const active = picked === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setDiscovery({ ...discovery, [q.key]: opt })}
                            className={`rounded-2xl border p-4 text-left text-sm transition-all ${
                              active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                            }`}
                          >
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{opt === "a" ? q.aLabel : q.bLabel}</div>
                            <div className="mt-1">{opt === "a" ? q.a : q.b}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {allAnswered && (
                <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm italic text-foreground/85">
                  {discoverySummary(discovery as DiscoveryProfile)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground disabled:opacity-30"
          >
            ← Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Discover your resonance <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
