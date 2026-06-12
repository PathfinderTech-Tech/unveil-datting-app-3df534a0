import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, MessageCircle, Trophy, BadgeCheck, CalendarDays, Lock, Sparkles } from "lucide-react";

type Signals = {
  trustScore: number;          // 0–100
  conversations: number;        // mutual matches w/ a conversation
  challenges: number;           // challenge_results rows
  verified: boolean;
  daysConnected: number;        // days since profile created
};

const TARGETS = {
  trustScore: 60,
  conversations: 1,
  challenges: 2,
  daysConnected: 3,
};

export function RevealProgressCard({ userId }: { userId: string }) {
  const [s, setS] = useState<Signals | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: prof }, { data: extras }, convs, chals] = await Promise.all([
        supabase.from("profiles").select("verified, created_at").eq("id", userId).maybeSingle(),
        (supabase as any).rpc("get_my_profile_extras"),
        supabase.from("conversations").select("id", { count: "exact", head: true })
          .or(`user_a.eq.${userId},user_b.eq.${userId}`),
        supabase.from("challenge_results").select("id", { count: "exact", head: true })
          .or(`user_id.eq.${userId},partner_id.eq.${userId}`),
      ]);
      if (!alive) return;
      const days = prof?.created_at
        ? Math.max(0, Math.floor((Date.now() - new Date(prof.created_at).getTime()) / 86_400_000))
        : 0;
      const extra = Array.isArray(extras) ? extras[0] : extras;
      setS({
        trustScore: extra?.trust_score ?? 0,
        conversations: convs.count ?? 0,
        challenges: chals.count ?? 0,
        verified: !!prof?.verified,
        daysConnected: days,
      });
    })();
    return () => { alive = false; };
  }, [userId]);

  if (!s) {
    return (
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading reveal progress…
      </div>
    );
  }

  const checks = {
    trust: s.trustScore >= TARGETS.trustScore,
    conv: s.conversations >= TARGETS.conversations,
    chal: s.challenges >= TARGETS.challenges,
    verif: s.verified,
    days: s.daysConnected >= TARGETS.daysConnected,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const pct = Math.round((passed / total) * 100);
  const unlocked = passed >= 4; // 4 of 5 signals to unlock direct contact sharing

  return (
    <div className="mt-6 rounded-3xl border border-primary/30 bg-card p-6 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Contact Sharing Progress
          </div>
          <div className="mt-1 font-display text-lg font-bold">
            {unlocked ? "Contact sharing available" : "Direct contact unlocks through real connection"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {unlocked
              ? "You've built enough trust — both sides must opt in to exchange contact info."
              : "Keep building. Phone, email, and social handles unlock after meaningful connection."}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${unlocked ? "bg-gradient-hero text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
          {unlocked ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{passed} of {total} signals met</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="mt-2"><Progress value={pct} /></div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Row icon={<ShieldCheck className="h-4 w-4" />} label="Trust score" value={`${s.trustScore} / ${TARGETS.trustScore}`} done={checks.trust} />
        <Row icon={<MessageCircle className="h-4 w-4" />} label="Conversations" value={`${s.conversations} / ${TARGETS.conversations}`} done={checks.conv} />
        <Row icon={<Trophy className="h-4 w-4" />} label="Challenges completed" value={`${s.challenges} / ${TARGETS.challenges}`} done={checks.chal} />
        <Row icon={<BadgeCheck className="h-4 w-4" />} label="Verification" value={s.verified ? "Verified" : "Not yet"} done={checks.verif} />
        <Row icon={<CalendarDays className="h-4 w-4" />} label="Days connected" value={`${s.daysConnected} / ${TARGETS.daysConnected}`} done={checks.days} />
      </div>
    </div>
  );
}

function Row({ icon, label, value, done }: { icon: React.ReactNode; label: string; value: string; done: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${done ? "border-primary/40 bg-primary/5" : "border-border bg-surface/40"}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className={done ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        <span className="text-foreground/90">{label}</span>
      </div>
      <span className={`font-mono text-xs ${done ? "text-primary" : "text-muted-foreground"}`}>{value}</span>
    </div>
  );
}
