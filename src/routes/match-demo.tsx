import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShieldCheck, Send, Sparkles, Heart, MoreVertical, X, Lock, CheckCircle2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/match-demo")({
  head: () => ({ meta: [{ title: "Match Demo — UNVEIL" }] }),
  component: Demo,
});

const NAME = "Sahari";
const SCORE = 56;
const DAY = 3;

const MSGS = [
  { mine: true,  text: "Hey Sahari! I saw you love photography too 📸", time: "8:35 AM" },
  { mine: false, text: "Yes! It's my favorite way to see the world. What's your favorite thing to shoot?", time: "8:37 AM" },
  { mine: true,  text: "Definitely landscapes 🏔️ Mountains and ocean views are unbeatable.", time: "8:38 AM" },
  { mine: false, text: "Amazing! I'm more of a city person but I love a good sunset anywhere.", time: "8:40 AM" },
];

const ICEBREAKERS = [
  "What's a place you've always wanted to visit?",
  "What's something you love that most people haven't tried?",
  "If you could learn any skill instantly, what would it be?",
];

function Ring({ value, size = 96 }: { value: number; size?: number }) {
  const r = size / 2 - 6, c = 2 * Math.PI * r, dash = (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--border) / 0.4)" strokeWidth={6} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#g)" strokeWidth={6} fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
        <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stopColor="hsl(var(--primary))" /><stop offset="100%" stopColor="hsl(var(--accent))" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-2xl font-bold leading-none">{value}%</div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Match</div>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-foreground/85">{label}</span><span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border/40">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 font-display font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      S
    </div>
  );
}

function Demo() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"compat" | "discovery" | "icebreakers" | "reveal">("compat");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col px-2 sm:px-4">
        {/* HEADER */}
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-1 py-2 backdrop-blur sm:gap-3">
          <button className="rounded-full p-1.5 text-muted-foreground hover:bg-surface"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar size={36} />
          <button onClick={() => { setTab("compat"); setOpen(true); }} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-base font-bold">{NAME}</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-primary">
              <Heart className="h-3 w-3 fill-current" /><span className="font-medium">{SCORE}% Compatible</span>
            </div>
          </button>
          <button onClick={() => { setTab("icebreakers"); setOpen(true); }} className="shrink-0 rounded-full border border-primary/30 p-1.5 text-primary hover:bg-primary/10">
            <Sparkles className="h-4 w-4" />
          </button>
          <button className="rounded-full p-1.5 text-muted-foreground hover:bg-surface"><MoreVertical className="h-4 w-4" /></button>
        </header>

        {/* CONVERSATION */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-2 py-4 sm:px-3">
            <div className="flex justify-center"><span className="text-[11px] font-medium text-muted-foreground">Today</span></div>
            {MSGS.map((m, i) => m.mine ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[78%] rounded-3xl rounded-br-md bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-sm text-primary-foreground shadow-lg shadow-primary/20">
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/80">
                    <span>{m.time}</span><span>✓✓</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-end justify-start gap-2">
                <Avatar size={28} />
                <div className="max-w-[75%] rounded-3xl rounded-bl-md bg-surface/80 px-4 py-2.5 text-sm text-foreground shadow-sm">
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* COMPOSER */}
          <div className="shrink-0 bg-background/95 px-3 pt-2 pb-3 backdrop-blur">
            <form className="flex items-end gap-2" onSubmit={e => e.preventDefault()}>
              <button type="button" onClick={() => { setTab("compat"); setOpen(true); }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                <span className="text-xl leading-none">+</span>
              </button>
              <textarea rows={1} placeholder={`Message ${NAME}…`} className="max-h-32 min-h-11 flex-1 resize-none rounded-full border border-border bg-surface/70 px-4 py-2.5 text-sm placeholder:text-muted-foreground outline-none focus:border-primary" />
              <button type="submit" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl">
            <div className="flex justify-center pt-2"><div className="h-1 w-10 rounded-full bg-border" /></div>
            <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 pt-3">
              {([
                { id: "compat", label: "Compatibility" },
                { id: "discovery", label: `Day ${DAY} Discovery` },
                { id: "icebreakers", label: "Icebreakers" },
                { id: "reveal", label: "Contact Reveal" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow" : "bg-surface/70 text-muted-foreground"}`}>{t.label}</button>
              ))}
              <button onClick={() => setOpen(false)} className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-surface"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-2">
              {tab === "compat" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5">
                    <Ring value={SCORE} size={120} />
                    <div className="text-sm font-medium">Overall Compatibility</div>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border bg-surface/40 p-4">
                    <Bar label="Values" value={60} />
                    <Bar label="Communication" value={60} />
                    <Bar label="Lifestyle" value={60} />
                    <Bar label="Future Goals" value={60} />
                  </div>
                </div>
              )}
              {tab === "discovery" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Day {DAY} of 7</div>
                    <Ring value={Math.round((DAY/7)*100)} size={110} />
                    <p className="max-w-xs text-sm text-foreground/85">You're in the discovery phase. Continue chatting to unlock more.</p>
                  </div>
                </div>
              )}
              {tab === "icebreakers" && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-muted-foreground">Break the ice with meaningful questions.</p>
                  {ICEBREAKERS.map((t, i) => (
                    <button key={i} className="block w-full rounded-2xl border border-border bg-surface/60 p-4 text-left text-sm hover:border-primary/40">{t}</button>
                  ))}
                  <button className="mx-auto mt-2 flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Suggest Another</button>
                </div>
              )}
              {tab === "reveal" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/40 p-6 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-full border border-primary/30 bg-primary/10"><Lock className="h-7 w-7 text-primary" /></div>
                    <p className="max-w-xs text-sm text-foreground/85">Reveal contact info to continue outside UNVEIL.</p>
                  </div>
                  <ul className="space-y-2 rounded-2xl border border-border bg-surface/40 p-4 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50" /><span className="text-muted-foreground">Complete Day 7</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground/50" /><span className="text-muted-foreground">High Compatibility</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span>Both Agree to Reveal</span></li>
                  </ul>
                  <button disabled className="w-full rounded-full bg-surface/60 px-4 py-3 text-sm text-muted-foreground">Reveal Contact</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
