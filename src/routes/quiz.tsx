import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { track, ANALYTICS } from "@/lib/analytics";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Relationship Quiz — UNVEIL" },
      { name: "description", content: "Five questions to shape who you meet on UNVEIL." },
    ],
  }),
  component: QuizFlow,
});

type Q = {
  id: string;
  context: string;
  question: string;
  sub?: string;
  options: { id: string; label: string }[];
};

const QUESTIONS: Q[] = [
  {
    id: "communication",
    context: "Discovering your communication style",
    question: "How do you prefer to share feelings?",
    options: [
      { id: "direct", label: "Direct — I say it plainly" },
      { id: "reflective", label: "Reflective — I think first, then share" },
      { id: "when_ready", label: "When I'm ready — never on demand" },
      { id: "actions", label: "Through actions more than words" },
    ],
  },
  {
    id: "pace",
    context: "Understanding your relationship pace",
    question: "What pace feels right for you?",
    options: [
      { id: "slow", label: "Slow & intentional" },
      { id: "gradual", label: "Gradual discovery" },
      { id: "open", label: "Open to either" },
    ],
  },
  {
    id: "values",
    context: "Mapping your core values",
    question: "What matters most in a partner?",
    options: [
      { id: "loyalty", label: "Loyalty" },
      { id: "ambition", label: "Ambition" },
      { id: "empathy", label: "Empathy" },
      { id: "faith", label: "Faith" },
      { id: "fun", label: "Fun" },
    ],
  },
  {
    id: "energy",
    context: "Reading your social energy",
    question: "How would you describe your energy?",
    options: [
      { id: "homebody", label: "Homebody" },
      { id: "balanced", label: "Balanced" },
      { id: "social", label: "Social butterfly" },
      { id: "adventurous", label: "Adventurous" },
    ],
  },
  {
    id: "mission",
    context: "Shared mission matching",
    question: "What are you building in life?",
    sub: "We connect people through purpose, not just hobbies.",
    options: [
      { id: "family", label: "A family" },
      { id: "career", label: "A career" },
      { id: "purpose", label: "A purposeful life" },
      { id: "travel", label: "Travel & experience" },
      { id: "community", label: "Community & service" },
      { id: "faith_life", label: "A faith-centered life" },
    ],
  },
];

const PREF_CARDS = [
  {
    id: "similar",
    title: "Similar matches",
    subtitle: "Grounded in what you share.",
    helper: "People who reflect your values, pace, and goals.",
  },
  {
    id: "complementary",
    title: "Complementary matches",
    subtitle: "Different in a way that balances you.",
    helper: "Great for contrast, growth, and surprise.",
    note: "Sometimes opposite attracts.",
  },
  {
    id: "both",
    title: "Explore both",
    subtitle: "Stay open to everything.",
    helper: "We'll introduce you to a mix of both.",
  },
] as const;

const STORAGE_KEY = "unveil-quiz-v1";

function QuizFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0..QUESTIONS.length-1 = question; QUESTIONS.length = preference
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pref, setPref] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [fade, setFade] = useState<"in" | "out">("in");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p.answers) setAnswers(p.answers);
        if (p.pref) setPref(p.pref);
      } catch { /* noop */ }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, pref }));
  }, [answers, pref]);

  const total = QUESTIONS.length;
  const onPrefStep = step === total;
  const q = onPrefStep ? null : QUESTIONS[step];
  const selected = q ? answers[q.id] : null;
  const canAdvance = useMemo(() => (onPrefStep ? !!pref : !!selected), [onPrefStep, pref, selected]);

  function transition(next: () => void) {
    setFade("out");
    setTimeout(() => {
      next();
      setShowError(false);
      setFade("in");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }, 150);
  }

  function select(qid: string, opt: string) {
    setAnswers((a) => ({ ...a, [qid]: opt }));
    setShowError(false);
  }

  function back() {
    if (step === 0) return;
    transition(() => setStep((s) => s - 1));
  }

  async function next() {
    if (!canAdvance) {
      setShowError(true);
      return;
    }
    if (!onPrefStep) {
      transition(() => setStep((s) => s + 1));
      return;
    }
    // Final submit
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("onboarding_answers")
          .select("answers")
          .eq("user_id", user.id)
          .maybeSingle();
        const merged = {
          ...((existing?.answers as object) ?? {}),
          quiz: { answers, match_preference: pref },
        };
        await supabase
          .from("onboarding_answers")
          .upsert({ user_id: user.id, answers: merged }, { onConflict: "user_id" });
      }
      toast.success("Your match style is set ✨");
      navigate({ to: "/matches" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-xl flex-col px-6 py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="text-center font-mono text-[12px] text-muted-foreground">
            {onPrefStep ? `Choose your match style` : `Question ${step + 1} of ${total}`}
          </div>
          <div className="mx-auto mt-2 h-[3px] w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-gradient-hero transition-all duration-300"
              style={{ width: `${((step + 1) / (total + 1)) * 100}%` }}
            />
          </div>
          {q && (
            <div className="mt-2 text-center text-[12px] text-muted-foreground">{q.context}</div>
          )}
        </div>

        {/* Body */}
        <div
          className="flex-1 motion-safe:transition-opacity"
          style={{
            opacity: fade === "in" ? 1 : 0,
            transitionDuration: fade === "in" ? "200ms" : "150ms",
          }}
        >
          {q ? (
            <>
              <h1 className="text-center font-display text-[22px] font-bold leading-snug">
                {q.question}
              </h1>
              {q.sub && (
                <p className="mx-auto mt-2 max-w-md text-center text-[14px] text-muted-foreground">
                  {q.sub}
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3">
                {q.options.map((opt) => {
                  const isSel = selected === opt.id;
                  const anySel = !!selected;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => select(q.id, opt.id)}
                      className={`min-h-[56px] rounded-xl border bg-surface px-5 text-left text-[15px] transition-all ${
                        isSel
                          ? "border-primary shadow-glow ring-1 ring-primary/40"
                          : "border-border hover:border-foreground/30"
                      } ${anySel && !isSel ? "opacity-65" : ""}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {showError && (
                <p className="mt-4 text-center text-[13px] text-yellow-500/90">
                  Please choose one option to continue.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-center font-display text-[22px] font-bold leading-snug">
                Who would you like to meet?
              </h1>
              <p className="mx-auto mt-2 max-w-md text-center text-[14px] text-muted-foreground">
                You can change this anytime in settings.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                {PREF_CARDS.map((c) => {
                  const isSel = pref === c.id;
                  const anySel = !!pref;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setPref(c.id); setShowError(false); }}
                      className={`relative rounded-2xl border bg-surface p-5 text-left transition-all duration-[220ms] ease-out ${
                        isSel
                          ? "scale-[1.03] border-primary shadow-glow ring-1 ring-primary/40"
                          : "border-border"
                      } ${anySel && !isSel ? "scale-[0.97] opacity-60" : ""}`}
                    >
                      <div className="font-display text-[17px] font-semibold">{c.title}</div>
                      <div className="mt-1 text-[14px] text-foreground/85">{c.subtitle}</div>
                      <div className="mt-1.5 text-[13px] text-muted-foreground">{c.helper}</div>
                      {"note" in c && c.note && (
                        <div className="mt-2 text-[11px] italic text-muted-foreground">{c.note}</div>
                      )}
                      {isSel && (
                        <div className="absolute bottom-2 right-3 font-mono text-[11px] text-muted-foreground">
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {showError && (
                <p className="mt-4 text-center text-[13px] text-yellow-500/90">
                  Please choose one option to continue.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            aria-label="Back"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || saving}
            className={`flex-1 rounded-full px-6 py-3.5 text-[15px] font-medium transition-all ${
              canAdvance
                ? "bg-gradient-hero text-primary-foreground shadow-glow"
                : "cursor-not-allowed bg-surface text-muted-foreground"
            }`}
          >
            {onPrefStep ? (saving ? "Saving…" : "Finish") : "Next →"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-[12px] text-muted-foreground hover:text-foreground">
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}
