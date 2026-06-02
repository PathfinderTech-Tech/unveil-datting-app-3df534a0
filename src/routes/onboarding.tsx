import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  PROFESSIONS, DISCOVERY_QUESTIONS, discoveryToCharacter, discoverySummary,
  type DiscoveryProfile, type Profession,
} from "@/lib/synapse-store";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ArrowRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Join UNVEIL" }, { name: "description", content: "A few playful questions to shape your Discovery Profile." }] }),
  component: Onboarding,
});

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Ireland","New Zealand",
  "Germany","France","Spain","Italy","Portugal","Netherlands","Belgium","Switzerland","Austria","Sweden","Norway","Denmark","Finland","Poland",
  "Brazil","Mexico","Argentina","Chile","Colombia",
  "Japan","South Korea","Singapore","Hong Kong","India","Indonesia","Philippines","Thailand","Vietnam",
  "UAE","Saudi Arabia","Israel","Turkey",
  "South Africa","Nigeria","Kenya","Egypt","Morocco",
  "Other",
];

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const INTENTS = [
  { id: "serious", label: "A serious relationship" },
  { id: "open", label: "Open to where it goes" },
  { id: "friendship", label: "Friendship first" },
  { id: "exploring", label: "Just exploring" },
];

const AVATAR_STYLES = [
  { id: "real",       label: "Real Photo",          hint: "Show the actual you." },
  { id: "anime",      label: "Anime Avatar",        hint: "Stylized, playful." },
  { id: "stylized",   label: "Stylized Avatar",     hint: "Graphic, modern." },
  { id: "realistic",  label: "Realistic AI Portrait", hint: "Painted, lifelike." },
  { id: "artistic",   label: "Artistic Illustration", hint: "Watercolor, soft." },
];

const CONNECTION_STYLES = [
  { id: "quick",     label: "Quick Connect",  hint: "I prefer chatting naturally.",            tone: "Skip games. Jump into messages." },
  { id: "discovery", label: "Discovery Mode", hint: "I enjoy questions and interactive experiences.", tone: "Spark, puzzles, challenges — the works." },
  { id: "slow",      label: "Slow Burn",      hint: "I like building trust before meeting.",    tone: "Take your time. Voice, words, then a date." },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState<Profession | null>(null);
  const [faceUploaded, setFaceUploaded] = useState(false);
  const [faceHarmony, setFaceHarmony] = useState(0);
  const [avatarStyle, setAvatarStyle] = useState<string>("real");
  const [discovery, setDiscovery] = useState<Partial<DiscoveryProfile>>({});
  const allAnswered = DISCOVERY_QUESTIONS.every((q) => discovery[q.key]);
  const character = allAnswered
    ? discoveryToCharacter(discovery as DiscoveryProfile)
    : { warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50 };

  const simulateFace = () => {
    setFaceUploaded(true);
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
    const draft = { name, age, gender, country, stateRegion, city, intent, email, profession: profession!, professionLabel: profObj.label, faceHarmony, avatarStyle, character, discovery, summary };
    sessionStorage.setItem("unveil-draft", JSON.stringify(draft));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          first_name: name, age, city, gender, intention: intent,
          curiosity_level: character.curiosity,
          emotional_rhythm: character as unknown as Record<string, number>,
          bio: summary || null,
          onboarding_complete: true,
        }).eq("id", user.id);
        await supabase.from("onboarding_answers").upsert({
          user_id: user.id,
          answers: { profession, professionLabel: profObj.label, faceHarmony, avatarStyle, country, stateRegion, character, discovery, summary, email },
        }, { onConflict: "user_id" });
      }
    } catch (e) { console.warn("[unveil] onboarding save skipped", e); }
    navigate({ to: "/game" });
  };

  const isUS = country === "United States";
  const stateRequired = !!country && !isUS && country !== "Other";

  const canNext = [
    // Step 0: identity — name, age, gender, country (required), intent, email
    name.length > 1 && !!gender && !!country && !!intent && /\S+@\S+\.\S+/.test(email),
    // Step 1: face + avatar style
    faceUploaded && faceHarmony > 0 && !!avatarStyle,
    // Step 2: profession
    profession !== null,
    // Step 3: discovery
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
              <h1 className="mt-2 font-display text-4xl font-bold">Tell us who you are.</h1>
              <p className="mt-1 text-sm text-muted-foreground">Phone number is never required.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name *">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada" className={inputCls} />
              </Field>
              <Field label="Age *">
                <input type="number" min={18} value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Gender *">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Country *">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                  <option value="">Select your country…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={`State / Province ${stateRequired ? "(optional)" : isUS ? "(optional — you can add later)" : "(optional)"}`}>
                <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="Optional" className={inputCls} />
              </Field>
              <Field label="City (optional)">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisbon" className={inputCls} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Email *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="What are you here for? *">
                  <div className="grid gap-2 md:grid-cols-2">
                    {INTENTS.map((it) => {
                      const active = intent === it.id;
                      return (
                        <button key={it.id} type="button" onClick={() => setIntent(it.id)}
                          className={`rounded-2xl border p-3 text-left text-sm transition-all ${
                            active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                          }`}>
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 02 — Your face & avatar</div>
              <h1 className="mt-2 font-display text-4xl font-bold">A glimpse, your way.</h1>
              <p className="mt-2 text-muted-foreground">Upload a selfie. Then choose how you want to appear — your real photo, or a generated avatar that still looks like you.</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-border bg-card p-10">
              {!faceUploaded ? (
                <button onClick={simulateFace} className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-face shadow-glow transition-transform hover:scale-105">
                    <Camera className="h-12 w-12 text-primary-foreground" />
                  </div>
                  <span className="font-medium">Tap to capture (demo)</span>
                  <span className="text-xs text-muted-foreground">We never share your raw selfie.</span>
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

            {faceUploaded && (
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-accent" /> Compatibility Avatar System
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {AVATAR_STYLES.map((s) => {
                    const active = avatarStyle === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setAvatarStyle(s.id)}
                        className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                          active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                        }`}>
                        <div className="font-display text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.hint}</div>
                        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You can switch between your real photo and your generated avatar at any time.
                </p>
              </div>
            )}
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
