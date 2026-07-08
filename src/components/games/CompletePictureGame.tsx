import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, Puzzle, RotateCcw, XCircle } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

type ChoicePuzzle = {
  id: string;
  title: string;
  stem: string;
  prompt: string;
  options: string[];
  answer: number;
};

type RoundState = "playing" | "correct" | "wrong" | "done";

const PER_QUESTION_SECONDS = 15;

const PUZZLES: ChoicePuzzle[] = [
  {
    id: "cp-1",
    title: "Alternating Pair",
    stem: "A B A B ?",
    prompt: "What should come next?",
    options: ["A", "B", "C", "AB"],
    answer: 0,
  },
  {
    id: "cp-2",
    title: "Rising Sequence",
    stem: "2 · 4 · 6 · 8 · ?",
    prompt: "Pick the missing number.",
    options: ["9", "10", "12", "14"],
    answer: 1,
  },
  {
    id: "cp-3",
    title: "Symbol Rotation",
    stem: "▲ ▼ ▲ ▼ ?",
    prompt: "Which symbol fits the pattern?",
    options: ["▲", "◆", "▼", "●"],
    answer: 0,
  },
  {
    id: "cp-4",
    title: "Mirror Letters",
    stem: "M · W · M · W · ?",
    prompt: "Continue the mirrored rhythm.",
    options: ["M", "W", "N", "V"],
    answer: 0,
  },
  {
    id: "cp-5",
    title: "Shape Count",
    stem: "■ ■ · ■ ■ ■ · ■ ■ ■ ■ · ?",
    prompt: "How many squares should the next group have?",
    options: ["2", "3", "4", "5"],
    answer: 3,
  },
  {
    id: "cp-6",
    title: "Clock Steps",
    stem: "1:00 · 3:00 · 5:00 · 7:00 · ?",
    prompt: "Each step advances equally. What is next?",
    options: ["8:00", "9:00", "10:00", "11:00"],
    answer: 1,
  },
  {
    id: "cp-7",
    title: "Word Build",
    stem: "LO · LOV · LOVE · ?",
    prompt: "Choose the next completion.",
    options: ["LOVEE", "LOVE ", "LOVER", "LOVES"],
    answer: 3,
  },
  {
    id: "cp-8",
    title: "Direction Cycle",
    stem: "↑ → ↓ ← ↑ → ?",
    prompt: "Which arrow keeps the cycle going?",
    options: ["↑", "→", "↓", "←"],
    answer: 2,
  },
  {
    id: "cp-9",
    title: "Even-Odd Pattern",
    stem: "1 · 4 · 3 · 8 · 5 · 12 · ?",
    prompt: "Select the missing value.",
    options: ["6", "7", "10", "14"],
    answer: 1,
  },
  {
    id: "cp-10",
    title: "Final Link",
    stem: "💙 + 🔑 = Open Mind, ❤️ + 🔑 = Open ?",
    prompt: "Complete the phrase.",
    options: ["Heart", "Path", "Door", "Star"],
    answer: 0,
  },
];

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function CompletePictureGame() {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<RoundState>("playing");
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(PER_QUESTION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  const answeredRef = useRef(false);
  const puzzle = PUZZLES[index];

  useEffect(() => {
    if (state !== "playing") return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          if (!answeredRef.current) {
            answeredRef.current = true;
            setState("wrong");
            setSelected(null);
          }
          return 0;
        }
        return current - 1;
      });
      setTotalTimeSpent((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state, index]);

  const accuracy = useMemo(() => {
    if (index === 0 && state !== "done") return 0;
    const answered = state === "done" ? PUZZLES.length : index + (state === "playing" ? 0 : 1);
    if (answered <= 0) return 0;
    return Math.round((score / answered) * 100);
  }, [index, score, state]);

  function moveToNext() {
    if (index + 1 >= PUZZLES.length) {
      setState("done");
      return;
    }

    answeredRef.current = false;
    setIndex((value) => value + 1);
    setSelected(null);
    setRemaining(PER_QUESTION_SECONDS);
    setState("playing");
  }

  function onSelect(optionIndex: number) {
    if (state !== "playing" || answeredRef.current) return;

    answeredRef.current = true;
    setSelected(optionIndex);

    if (optionIndex === puzzle.answer) {
      setScore((value) => value + 1);
      setState("correct");
      return;
    }

    setState("wrong");
  }

  function resetGame() {
    answeredRef.current = false;
    setIndex(0);
    setState("playing");
    setScore(0);
    setRemaining(PER_QUESTION_SECONDS);
    setSelected(null);
    setTotalTimeSpent(0);
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <UnveilNav />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/game"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Solo Mind Games
          </Link>

          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              UNVEIL · Solo Mind Games
            </div>
            <h1 className="bg-gradient-hero bg-clip-text font-display text-2xl font-bold text-transparent">
              Complete the Picture
            </h1>
          </div>

          <div className="w-[86px]" />
        </div>

        {state !== "done" && (
          <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-hero transition-all duration-500"
              style={{ width: `${((index + (state === "playing" ? 0 : 1)) / PUZZLES.length) * 100}%` }}
            />
          </div>
        )}

        {state === "done" ? (
          <section className="rounded-3xl border border-primary/30 bg-card p-6 text-center shadow-glow sm:p-8">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10">
              <Puzzle className="h-9 w-9 text-primary" />
            </div>
            <h2 className="font-display text-3xl">Challenge Complete</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Great rhythm. Replay to improve your score and speed.
            </p>

            <div className="my-6 grid grid-cols-2 gap-3">
              <StatCard label="Score" value={`${score}/${PUZZLES.length}`} />
              <StatCard label="Accuracy" value={`${Math.round((score / PUZZLES.length) * 100)}%`} />
              <StatCard label="Time" value={formatClock(totalTimeSpent)} />
              <StatCard label="Round Type" value="Timed" />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={resetGame}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
              <Link
                to="/game"
                className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Back to Solo Mind Games
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-glow sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Question {index + 1} of {PUZZLES.length}
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs ${
                  remaining <= 5
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary/10 text-primary"
                }`}
              >
                <Clock3 className="h-3 w-3" /> {formatClock(remaining)}
              </div>
            </div>

            {state === "playing" ? (
              <>
                <div className="rounded-2xl border border-primary/30 bg-surface/70 p-4 text-center sm:p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {puzzle.title}
                  </div>
                  <div className="mt-3 font-display text-2xl sm:text-3xl">{puzzle.stem}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{puzzle.prompt}</p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {puzzle.options.map((option, optionIndex) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onSelect(optionIndex)}
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-primary hover:bg-primary/10"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <div
                  className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
                    state === "correct"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {state === "correct" ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <XCircle className="h-8 w-8" />
                  )}
                </div>

                <h2
                  className={`font-display text-3xl ${
                    state === "correct" ? "text-emerald-400" : "text-destructive"
                  }`}
                >
                  {state === "correct" ? "Correct" : "Not Quite"}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {state === "correct"
                    ? "You completed this piece perfectly."
                    : `Correct answer: ${puzzle.options[puzzle.answer]}`}
                </p>

                <div className="mt-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={moveToNext}
                    className="rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
                  >
                    {index + 1 >= PUZZLES.length ? "See Result" : "Next Puzzle"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 text-center text-xs text-muted-foreground">
              Score: {score} · Accuracy: {accuracy}%
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}
