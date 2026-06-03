import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, KeyRound, Check } from "lucide-react";

export const Route = createFileRoute("/play/escape")({
  head: () => ({ meta: [{ title: "Relationship Escape Room — UNVEIL" }] }),
  component: Escape,
});

type Puzzle = { id: string; prompt: string; hint: string; answer: string; dim: "teamwork" | "communication" | "leadership" | "patience" };

const PUZZLES: Puzzle[] = [
  { id: "p1", dim: "communication", prompt: "Which 4-letter word means both 'silence' AND 'a small letter'?", hint: "Think notes…", answer: "note" },
  { id: "p2", dim: "teamwork", prompt: "If A trusts B and B trusts C, the relationship that grows fastest is between ___ and ___.", hint: "Triangulate.", answer: "a and c" },
  { id: "p3", dim: "leadership", prompt: "You're lost on a trail. Two options: known but slow, fast but unmapped. Pick one word.", hint: "What kind of decision?", answer: "known" },
  { id: "p4", dim: "patience", prompt: "Type the word 'wait' but pause 5 seconds between each letter. (Just type it — we'll trust you.)", hint: "Pause.", answer: "wait" },
];

const DIM_LABEL = { teamwork: "Teamwork", communication: "Communication", leadership: "Leadership", patience: "Patience" };

function Escape() {
  const [i, setI] = useState(0);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [showHint, setShowHint] = useState(false);

  const p = PUZZLES[i];
  const done = i >= PUZZLES.length;

  function submit() {
    if (draft.trim().toLowerCase() === p.answer.toLowerCase()) {
      setSolved((s) => ({ ...s, [p.id]: true }));
      setTimeout(() => { setI((x) => x + 1); setDraft(""); setShowHint(false); }, 600);
    }
  }

  if (done) {
    const score = (dim: Puzzle["dim"]) => {
      const total = PUZZLES.filter((x) => x.dim === dim).length;
      const got = PUZZLES.filter((x) => x.dim === dim && solved[x.id]).length;
      return total ? Math.round((got / total) * 100) : 0;
    };
    const dynamic = Math.round((Object.values(solved).filter(Boolean).length / PUZZLES.length) * 100);
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link to="/play" className="text-xs text-muted-foreground hover:text-foreground">← Back to games</Link>
          <div className="mt-6 rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <div className="font-mono text-xs uppercase tracking-wider opacity-80">Relationship Dynamic Score</div>
            <div className="mt-3 font-display text-7xl font-bold">{dynamic}</div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {(["teamwork", "communication", "leadership", "patience"] as const).map((d) => (
                <div key={d} className="rounded-2xl bg-background/20 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">{DIM_LABEL[d]}</div>
                  <div className="mt-1 font-display text-2xl font-bold">{score(d)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <h1 className="mt-4 font-display text-4xl font-bold">Escape Room</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solve together. Each puzzle reveals a relational dimension.</p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-8">
          <div className="flex justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>Puzzle {i + 1}/{PUZZLES.length}</span>
            <span>{DIM_LABEL[p.dim]}</span>
          </div>
          <div className="mt-4 font-display text-xl">{p.prompt}</div>

          <div className="mt-6 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Type your answer…"
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
            <button onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              <KeyRound className="h-3.5 w-3.5" /> Try
            </button>
          </div>

          {solved[p.id] && <div className="mt-3 inline-flex items-center gap-2 text-sm text-neon"><Check className="h-4 w-4" /> Solved</div>}

          <button onClick={() => setShowHint(true)} className="mt-4 text-xs text-muted-foreground underline">
            Need a hint?
          </button>
          {showHint && <div className="mt-2 text-xs text-muted-foreground">Hint: {p.hint}</div>}
        </div>
      </div>
    </div>
  );
}
