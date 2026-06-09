import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Clock, Check, X, Trophy, Sparkles, RotateCcw, Puzzle } from "lucide-react";
import { useUserId, awardBadge } from "@/lib/games-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import heart from "@/assets/puzzles/heart.png";
import apple from "@/assets/puzzles/apple.png";
import flower from "@/assets/puzzles/flower.png";
import moon from "@/assets/puzzles/moon.png";
import ring from "@/assets/puzzles/ring.png";
import compass from "@/assets/puzzles/compass.png";
import butterfly from "@/assets/puzzles/butterfly.png";
import crown from "@/assets/puzzles/crown.png";
import map from "@/assets/puzzles/map.png";
import veil from "@/assets/puzzles/veil.png";

type Puzzle = {
  id: string;
  name: string;
  image: string;
  /** Index (1-4) of the correct piece. */
  correct: 1 | 2 | 3 | 4;
  explanation: string;
};

const PUZZLES: Puzzle[] = [
  { id: "heart",     name: "Heart",     image: heart,     correct: 2, explanation: "The missing piece has one tab on the left and one on the bottom." },
  { id: "apple",     name: "Apple",     image: apple,     correct: 3, explanation: "Look at the curve — the piece fits the rounded body of the apple." },
  { id: "flower",    name: "Flower",    image: flower,    correct: 1, explanation: "The petal contour matches piece 1." },
  { id: "moon",      name: "Moon",      image: moon,      correct: 2, explanation: "Crescent curve aligns with the cut on piece 2." },
  { id: "ring",      name: "Ring",      image: ring,      correct: 4, explanation: "The band thickness matches the fourth piece." },
  { id: "compass",   name: "Compass",   image: compass,   correct: 3, explanation: "The dial gap fits the third piece's arrow tabs." },
  { id: "butterfly", name: "Butterfly", image: butterfly, correct: 1, explanation: "Wing symmetry matches piece 1." },
  { id: "crown",     name: "Crown",     image: crown,     correct: 2, explanation: "The jewel slot aligns with piece 2." },
  { id: "map",       name: "Map",       image: map,       correct: 4, explanation: "Folded crease matches the contour of piece 4." },
  { id: "veil",      name: "Veil",      image: veil,      correct: 1, explanation: "The hem's flow matches piece 1." },
];

const QUESTION_SECONDS = 15;

export const Route = createFileRoute("/challenges/complete-picture")({
  head: () => ({
    meta: [
      { title: "Complete the Picture — UNVEIL Challenges" },
      { name: "description", content: "Choose the piece that best completes the picture. 10 puzzles, 15 seconds each." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen"><UnveilNav /><div className="mx-auto max-w-md p-12 text-center">
      <div className="text-sm text-destructive">{error.message}</div>
      <Link to="/challenges" className="mt-4 inline-block text-primary">Back to Challenges</Link>
    </div></div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen"><UnveilNav /><div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Not found.</div></div>
  ),
  component: CompletePicture,
});

type Phase = "playing" | "correct" | "wrong" | "done";

function CompletePicture() {
  const uid = useUserId();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [seconds, setSeconds] = useState(QUESTION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedRef = useRef(false);

  const total = PUZZLES.length;
  const q = PUZZLES[idx];
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing") return;
    setSeconds(QUESTION_SECONDS);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit as wrong if time runs out
          setPhase("wrong");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { timerRef.current && clearInterval(timerRef.current); };
  }, [idx, phase]);

  // Save final score once
  useEffect(() => {
    if (phase !== "done" || savedRef.current) return;
    savedRef.current = true;
    if (!uid) return;
    (async () => {
      try {
        await supabase.from("game_results").insert({
          user_id: uid,
          game_id: "complete_picture",
          score,
          total_questions: total,
          emotional_score: accuracy,
        } as never);
        if (accuracy >= 80) awardBadge("complete-picture-ace");
      } catch (e) {
        console.warn("save score failed", e);
      }
    })();
  }, [phase, uid, score, total, accuracy]);

  function submit() {
    if (phase !== "playing" || pick == null) return;
    timerRef.current && clearInterval(timerRef.current);
    if (pick === q.correct) {
      setScore((s) => s + 1);
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  function next() {
    if (idx + 1 >= total) { setPhase("done"); return; }
    setIdx((i) => i + 1);
    setPick(null);
    setPhase("playing");
  }

  function playAgain() {
    setIdx(0); setPick(null); setScore(0); setPhase("playing"); setSeconds(QUESTION_SECONDS);
    savedRef.current = false;
  }

  const progressPct = ((idx + (phase === "playing" ? 0 : 1)) / total) * 100;

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/challenges" })}
            className="rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            aria-label="Back to Challenges"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">UNVEIL · New Challenge</div>
            <h1 className="bg-gradient-hero bg-clip-text font-display text-xl font-bold tracking-tight text-transparent">
              <Sparkles className="mr-1 inline h-4 w-4 text-accent" />
              Complete the Picture
            </h1>
          </div>
          <div className="w-9" />
        </div>

        {phase !== "done" && (
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-gradient-hero transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {phase === "done" ? (
          <FinalScreen
            score={score} total={total} accuracy={accuracy}
            onPlayAgain={playAgain}
            onBack={() => navigate({ to: "/challenges" })}
          />
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-glow sm:p-6">
            {/* Question header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Question {idx + 1} of {total}</div>
              <TimerBadge seconds={seconds} active={phase === "playing"} />
            </div>

            {/* Feedback state takes over middle */}
            {phase === "correct" ? (
              <Feedback kind="correct" puzzle={q} onNext={next} isLast={idx + 1 >= total} />
            ) : phase === "wrong" ? (
              <Feedback kind="wrong" puzzle={q} onNext={next} isLast={idx + 1 >= total} />
            ) : (
              <>
                <div className="mb-3 text-center font-display text-lg">Choose the piece that best completes the picture.</div>
                <div className="mx-auto mb-5 flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-br from-surface/60 to-background p-4">
                  <img src={q.image} alt={q.name} loading="eager" width={512} height={512} className="h-full w-full object-contain drop-shadow-[0_8px_30px_rgba(168,85,247,0.25)]" />
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((n) => {
                    const active = pick === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPick(n as 1 | 2 | 3 | 4)}
                        className={`group relative aspect-square overflow-hidden rounded-2xl border-2 p-3 transition-all ${
                          active
                            ? "border-primary bg-primary/10 shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
                            : "border-border bg-surface hover:border-primary/40"
                        }`}
                        aria-pressed={active}
                      >
                        <div className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 font-mono text-xs font-semibold text-foreground">
                          {n}
                        </div>
                        <PuzzlePieceVisual seed={`${q.id}-${n}`} active={active} hue={hueFor(q.id)} />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={pick == null}
                  onClick={submit}
                  className="w-full rounded-full bg-gradient-hero py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit Answer
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimerBadge({ seconds, active }: { seconds: number; active: boolean }) {
  const danger = seconds <= 5;
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs ${
        !active
          ? "border-emerald-500/40 text-emerald-400"
          : danger
            ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse"
            : "border-primary/40 bg-primary/10 text-primary"
      }`}
    >
      <Clock className="h-3 w-3" /> {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
    </div>
  );
}

function Feedback({ kind, puzzle, onNext, isLast }: { kind: "correct" | "wrong"; puzzle: Puzzle; onNext: () => void; isLast: boolean }) {
  const isCorrect = kind === "correct";
  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
          isCorrect ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
        }`}
      >
        {isCorrect ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
      </div>
      <div className={`font-display text-2xl font-bold ${isCorrect ? "text-emerald-400" : "text-destructive"}`}>
        {isCorrect ? "Correct!" : "Not quite!"}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isCorrect ? "Great job! You have a great eye." : "Better luck next time."}
      </p>

      <div className="my-5 rounded-2xl border border-border bg-surface/50 p-4 text-left">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Explanation</div>
        <div className="text-sm">{puzzle.explanation}</div>
      </div>

      <div className="mx-auto mb-4 flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl bg-gradient-to-br from-surface/60 to-background p-3">
        <img src={puzzle.image} alt={puzzle.name} width={512} height={512} className="h-full w-full object-contain" />
      </div>

      {!isCorrect && (
        <div className="mb-4 text-sm text-emerald-400">
          Correct answer was: <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 font-mono">{puzzle.correct}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-full bg-gradient-hero py-3 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        {isLast ? "See Results" : "Next Question"}
      </button>
    </div>
  );
}

function FinalScreen({ score, total, accuracy, onPlayAgain, onBack }: { score: number; total: number; accuracy: number; onPlayAgain: () => void; onBack: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-glow">
      <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-hero opacity-30 blur-xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-accent bg-surface">
          <Trophy className="h-10 w-10 text-accent" />
        </div>
      </div>
      <h2 className="bg-gradient-hero bg-clip-text font-display text-2xl font-bold text-transparent">Challenge Complete!</h2>
      <p className="mt-1 text-sm text-muted-foreground">Great job!</p>

      <div className="my-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Your Score</div>
          <div className="mt-1 font-display text-2xl">
            <span className="text-accent">{score}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Accuracy</div>
          <div className="mt-1 font-display text-2xl text-accent">{accuracy}%</div>
        </div>
      </div>

      <p className="mb-5 text-xs text-muted-foreground">
        You answered {score} out of {total} correctly. Keep playing to improve your score!
      </p>

      <div className="space-y-2">
        <button
          onClick={onPlayAgain}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-full border border-border bg-surface py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Challenges
        </button>
      </div>
    </div>
  );
}

// Simple SVG puzzle piece, tinted per-question so options look like the picture's missing piece.
function PuzzlePieceVisual({ seed, active, hue }: { seed: string; active: boolean; hue: number }) {
  // Add subtle rotation variety based on seed
  const deg = useMemo(() => {
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return (h % 4) * 90;
  }, [seed]);
  const fill = `hsl(${hue} 75% 55%)`;
  const stroke = `hsl(${hue} 70% 35%)`;
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ transform: `rotate(${deg}deg)` }}>
      <svg viewBox="0 0 100 100" className={`h-3/4 w-3/4 transition-transform ${active ? "scale-110" : ""}`}>
        <path
          d="M20 20 H 42 a8 8 0 1 1 16 0 H 80 V 42 a8 8 0 1 0 0 16 V 80 H 58 a8 8 0 1 1 -16 0 H 20 V 58 a8 8 0 1 0 0 -16 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function hueFor(id: string): number {
  // Map puzzle id to a hue close to the puzzle color
  const map: Record<string, number> = {
    heart: 0, apple: 110, flower: 330, moon: 48, ring: 45,
    compass: 38, butterfly: 215, crown: 45, map: 220, veil: 220,
  };
  return map[id] ?? 280;
}
