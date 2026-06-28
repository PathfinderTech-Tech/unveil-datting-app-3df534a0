import { useEffect, useState } from "react";
import { X, MessageCircle, Mic, Gift, Trophy, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  peerName: string;
};

type DayBucket = {
  date: string; // YYYY-MM-DD
  messages: number;
  voiceNotes: number;
  gifts: number;
};

/**
 * MVP Conversation Journal — replaces the legacy "Date" quick-action.
 * Aggregates message activity per UTC day. The richer AI summary /
 * milestones surface arrives in a follow-up.
 */
export function JournalSheet({ open, onClose, conversationId, peerName }: Props) {
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<DayBucket[]>([]);

  useEffect(() => {
    if (!open || !conversationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("created_at, message_type, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const map = new Map<string, DayBucket>();
      for (const m of data ?? []) {
        const d = new Date(m.created_at as string).toISOString().slice(0, 10);
        const b = map.get(d) ?? { date: d, messages: 0, voiceNotes: 0, gifts: 0 };
        const t = (m as { message_type?: string | null }).message_type ?? null;
        const c = (m as { content?: string | null }).content ?? "";
        if (t === "voice") b.voiceNotes += 1;
        else if (t === "gift" || c.startsWith("[[gift:")) b.gifts += 1;
        else b.messages += 1;
        map.set(d, b);
      }
      setDays(Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Conversation Journal">
      <button
        type="button"
        aria-label="Close journal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-3xl border-t border-[oklch(0.56_0.22_286/0.22)] bg-[oklch(0.10_0.04_298/0.96)] backdrop-blur-2xl shadow-[0_-20px_60px_-20px_oklch(0_0_0/0.6)]">
        <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.48_0.14_240)] to-[oklch(0.40_0.14_265)]">
              <Calendar className="h-4 w-4 text-white" />
            </span>
            <div>
              <h3 className="font-display text-lg text-foreground">Journal</h3>
              <p className="text-[11px] text-muted-foreground">
                Your conversation timeline with {peerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-[oklch(0.18_0.07_298/0.6)] text-foreground/70 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : days.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface/40 p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-foreground/80">
                Your conversation journal will appear here as your connection grows.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Each day you chat, an entry is created automatically.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {days.map((d) => {
                const total = d.messages + d.voiceNotes + d.gifts;
                const tone =
                  total >= 20 ? "text-emerald-400" : total >= 5 ? "text-amber-400" : "text-muted-foreground";
                const label = new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <li
                    key={d.date}
                    className="rounded-2xl border border-border/60 bg-surface/40 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-display text-sm text-foreground">{label}</div>
                      <div className={`font-mono text-[10px] uppercase tracking-wider ${tone}`}>
                        {total >= 20 ? "Great conversation" : total >= 5 ? "Moderate" : "Light"}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat icon={MessageCircle} value={d.messages} label="Messages" />
                      <Stat icon={Mic} value={d.voiceNotes} label="Voice" />
                      <Stat icon={Gift} value={d.gifts} label="Gifts" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-surface/20 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
              <Trophy className="h-3.5 w-3.5" /> Coming soon
            </div>
            <p className="text-[12px] text-muted-foreground">
              AI summaries, calendar mood, milestones (first voice, first gift, photo unveiled),
              and conversation memory that powers smarter AI suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-[oklch(0.13_0.05_298/0.5)] px-2 py-2 text-center">
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-foreground/70" />
      <div className="font-display text-sm text-foreground">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
