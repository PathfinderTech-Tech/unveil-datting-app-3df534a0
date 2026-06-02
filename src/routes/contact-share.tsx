import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SafetyReminder } from "@/components/SafetyReminder";
import { Phone, Lock, Unlock, Check, MessageSquare, Instagram, Send, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/contact-share")({
  head: () => ({
    meta: [
      { title: "Share Contact — UNVEIL" },
      { name: "description", content: "Contact details unlock only when both people consent." },
    ],
  }),
  component: ContactShare,
});

type Channel = "phone" | "whatsapp" | "instagram" | "telegram";

function ContactShare() {
  const [matched] = useState(true);
  // Five independent paths — completing ANY one is enough.
  const [paths, setPaths] = useState({
    spark: true,          // Completed Spark Questions together
    challenge: true,      // Completed a Couple Challenge
    messages: false,      // Exchanged meaningful messages
    voice: false,         // Completed a voice chat
    meet: false,          // Mutual agreement to meet
  });
  const [partnerMeet] = useState(true); // mock — partner also said yes
  const togglePath = (k: keyof typeof paths) => setPaths((p) => ({ ...p, [k]: !p[k] }));

  const [youApprove, setYouApprove] = useState<Record<Channel, boolean>>({
    phone: false, whatsapp: false, instagram: false, telegram: false,
  });
  const [partnerApprove] = useState<Record<Channel, boolean>>({
    phone: true, whatsapp: true, instagram: false, telegram: false,
  });

  const completedPaths = Object.values(paths).filter(Boolean).length;
  // Mutual meet only counts if both said yes.
  const mutualMeet = paths.meet && partnerMeet;
  // Unlock if matched AND at least one non-meet path is done, OR mutual meet.
  const nonMeetDone = paths.spark || paths.challenge || paths.messages || paths.voice;
  const canShare = matched && (mutualMeet || nonMeetDone);

  const toggle = (c: Channel) => setYouApprove((s) => ({ ...s, [c]: !s[c] }));

  const channels: { id: Channel; label: string; icon: React.ElementType; placeholder: string }[] = [
    { id: "phone", label: "Phone number", icon: Phone, placeholder: "+1 (•••) •••-•••" },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, placeholder: "Hidden until mutual consent" },
    { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "@hidden" },
    { id: "telegram", label: "Telegram", icon: Send, placeholder: "@hidden" },
  ];

  const pathList: { key: keyof typeof paths; label: string; hint: string }[] = [
    { key: "spark",     label: "Completed Spark Questions",     hint: "You've answered together." },
    { key: "challenge", label: "Completed a Couple Challenge",  hint: "Played one playful round." },
    { key: "messages",  label: "Exchanged meaningful messages", hint: "Real back-and-forth, not just hellos." },
    { key: "voice",     label: "Completed a voice chat",        hint: "Heard each other's voice." },
    { key: "meet",      label: "Mutual agreement to meet",      hint: "You both said yes to a real date." },
  ];

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contact Sharing</div>
          <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">
            Share when <span className="italic text-gradient-hero">both</span> of you are ready.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Phone numbers and socials stay hidden until you and your match both consent. No pressure, no surprises.
          </p>
        </div>

        <SafetyReminder />

        {/* Multi-path unlock — any ONE path is enough */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Unlock paths</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {completedPaths}/5 complete · need any 1
            </div>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Different people connect differently. Complete any single path below to unlock contact sharing — games and challenges are never required.
          </p>
          <ul className="space-y-2 text-sm">
            <Gate done={matched} label="You're matched" />
            {pathList.map((p) => (
              <li key={p.key} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-3">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${paths[p.key] ? "bg-neon/20 text-neon" : "bg-surface text-muted-foreground"}`}>
                  {paths[p.key] ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={paths[p.key] ? "text-foreground" : "text-muted-foreground"}>{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.hint}</div>
                </div>
                <button
                  onClick={() => togglePath(p.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    paths[p.key] ? "border border-neon/40 bg-neon/10 text-foreground" : "border border-border bg-card hover:border-primary"
                  }`}
                >
                  {paths[p.key] ? "Done" : "Mark done"}
                </button>
              </li>
            ))}
          </ul>
          {paths.meet && !partnerMeet && (
            <p className="mt-3 text-[11px] text-amber-400">Waiting on your match to also say yes to meeting.</p>
          )}
        </div>

        {/* Channels */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-xl">Choose what to share</div>
              <div className="text-xs text-muted-foreground">
                {canShare ? "Both must approve a channel for it to unlock." : "Locked until prerequisites are met."}
              </div>
            </div>
            {canShare ? <Unlock className="h-5 w-5 text-neon" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
          </div>

          <div className="space-y-3">
            {channels.map((c) => {
              const both = youApprove[c.id] && partnerApprove[c.id];
              const Icon = c.icon;
              return (
                <div key={c.id} className={`rounded-2xl border p-4 transition-all ${both ? "border-neon/60 bg-neon/5" : "border-border bg-surface/40"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {both ? "Unlocked — shown to both of you" : c.placeholder}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={!canShare}
                      onClick={() => toggle(c.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        youApprove[c.id] ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary"
                      }`}
                    >
                      {youApprove[c.id] ? "You approved" : "Approve"}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span className={youApprove[c.id] ? "text-foreground" : ""}>
                      {youApprove[c.id] ? <Check className="inline h-3 w-3 text-neon" /> : <Lock className="inline h-3 w-3" />} You
                    </span>
                    <span className={partnerApprove[c.id] ? "text-foreground" : ""}>
                      {partnerApprove[c.id] ? <Check className="inline h-3 w-3 text-neon" /> : <Lock className="inline h-3 w-3" />} Match
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {canShare && (
            <Link to="/date-plan" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow">
              Plan your date <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Gate({ done, label, link }: { done: boolean; label: string; link?: { to: string; label: string } }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-neon/20 text-neon" : "bg-surface text-muted-foreground"}`}>
        {done ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      {!done && link && <Link to={link.to} className="ml-auto text-xs text-primary underline">{link.label}</Link>}
    </li>
  );
}
