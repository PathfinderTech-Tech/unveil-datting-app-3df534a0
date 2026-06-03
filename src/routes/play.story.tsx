import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, BookOpen, Send } from "lucide-react";

export const Route = createFileRoute("/play/story")({
  head: () => ({ meta: [{ title: "Story Builder — UNVEIL" }] }),
  component: StoryBuilder,
});

const STARTERS = [
  "It was the kind of morning where the city forgot to wake up.",
  "She found the letter inside a book she'd never opened.",
  "Neither of them remembered who suggested the train first.",
];

type Line = { who: "you" | "them"; text: string };

function StoryBuilder() {
  const [story, setStory] = useState<Line[]>([{ who: "them", text: STARTERS[Math.floor(Math.random() * STARTERS.length)] }]);
  const [draft, setDraft] = useState("");
  const next = story[story.length - 1].who === "you" ? "them" : "you";

  function add() {
    if (!draft.trim()) return;
    setStory((s) => [...s, { who: next, text: draft.trim() }]);
    setDraft("");
    // Simulated partner reply
    if (next === "you") {
      setTimeout(() => {
        const filler = [
          "She paused, considering.",
          "Outside, a tram bell rang twice.",
          "He thought about what to say next, and said nothing.",
        ];
        setStory((s) => [...s, { who: "them", text: filler[Math.floor(Math.random() * filler.length)] }]);
      }, 800);
    }
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <h1 className="mt-4 font-display text-4xl font-bold">Story Builder</h1>
        <p className="mt-2 text-sm text-muted-foreground">Take turns. One line at a time. See where you end up.</p>

        <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-6">
          {story.map((line, i) => (
            <div key={i} className={`flex ${line.who === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${line.who === "you" ? "bg-primary/20 text-foreground" : "bg-surface text-foreground/90"}`}>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{line.who}</div>
                {line.text}
              </div>
            </div>
          ))}
        </div>

        {next === "you" && (
          <div className="mt-4 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Add the next sentence…"
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
            <button onClick={add} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              <Send className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        )}

        {story.length >= 8 && (
          <div className="mt-6 rounded-2xl border border-neon/40 bg-neon/5 p-4 text-sm">
            <BookOpen className="mb-1 inline h-4 w-4 text-neon" /> You built {Math.floor(story.length / 2)} turns together. Nice creative chemistry.
          </div>
        )}
      </div>
    </div>
  );
}
