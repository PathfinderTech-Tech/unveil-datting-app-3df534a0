import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SynapseNav } from "@/components/SynapseNav";
import { PROFESSIONS, type CharacterDNA, type Profession } from "@/lib/synapse-store";
import { Camera, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Join SYNAPSE" }, { name: "description", content: "Set up your cognitive dating profile." }] }),
  component: Onboarding,
});

const TRAITS: { key: keyof CharacterDNA; label: string; left: string; right: string }[] = [
  { key: "warmth", label: "Warmth", left: "Reserved", right: "Effusive" },
  { key: "curiosity", label: "Curiosity", left: "Focused", right: "Wide-open" },
  { key: "adventure", label: "Adventure", left: "Homebody", right: "Wanderer" },
  { key: "loyalty", label: "Loyalty", left: "Independent", right: "Devoted" },
  { key: "humor", label: "Humor", left: "Dry", right: "Playful" },
  { key: "ambition", label: "Ambition", left: "Easeful", right: "Driven" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(28);
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState<Profession | null>(null);
  const [faceUploaded, setFaceUploaded] = useState(false);
  const [faceHarmony, setFaceHarmony] = useState(0);
  const [character, setCharacter] = useState<CharacterDNA>({
    warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50,
  });

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

  const finish = () => {
    const profObj = PROFESSIONS.find((p) => p.id === profession)!;
    const draft = { name, age, city, profession: profession!, professionLabel: profObj.label, faceHarmony, character };
    sessionStorage.setItem("synapse-draft", JSON.stringify(draft));
    navigate({ to: "/game" });
  };

  const canNext = [
    name.length > 1 && city.length > 1,
    faceUploaded && faceHarmony > 0,
    profession !== null,
    true,
  ][step];

  return (
    <div className="min-h-screen">
      <SynapseNav />
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
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 02 — Face Harmony</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Show us your face.</h1>
              <p className="mt-2 text-muted-foreground">We analyze symmetry & expressiveness. Used for compatibility — never for ranking.</p>
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
                  <div className="text-sm text-muted-foreground">Face Harmony detected</div>
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
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 04 — Character DNA</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Six sliders. Be honest.</h1>
            </div>
            <div className="space-y-5 rounded-3xl border border-border bg-card p-6">
              {TRAITS.map((t) => (
                <div key={t.key}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-mono uppercase tracking-wider text-muted-foreground">{t.left}</span>
                    <span className="font-display font-bold">{t.label}</span>
                    <span className="font-mono uppercase tracking-wider text-muted-foreground">{t.right}</span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={character[t.key]}
                    onChange={(e) => setCharacter({ ...character, [t.key]: +e.target.value })}
                    className="w-full accent-[var(--primary)]"
                  />
                </div>
              ))}
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
              Start the Mind Game <ArrowRight className="h-4 w-4" />
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
