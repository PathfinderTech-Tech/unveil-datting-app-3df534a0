import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Smile, MoreVertical, Flag, Ban, UserX, Check, CheckCheck, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateIcebreakers } from "@/lib/icebreakers.functions";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Conversations — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: Chat,
});

type Conv = { id: string; user_a: string; user_b: string; last_message_at: string | null };
type Msg = { id: string; sender_id: string; content: string; created_at: string; delivered_at?: string | null };
type Reaction = { message_id: string; user_id: string; emoji: string };

const QUICK_EMOJI = ["❤️", "😂", "🔥", "👍", "🥺", "🎉"];

// Strip phone/email/social handles for safety until consent is given.
function scrubPII(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[contact hidden]")
    .replace(/(?:\+?\d[\s().-]{0,2}){7,}/g, "[contact hidden]")
    .replace(/(@|instagram\.com\/|t\.me\/|wa\.me\/)\w+/gi, "[contact hidden]");
}

function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { c: wantId } = Route.useSearch();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reads, setReads] = useState<Record<string, string[]>>({});
  const [typingPeer, setTypingPeer] = useState(false);
  const [draft, setDraft] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ text: string; kind: string }[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("*").order("last_message_at", { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setConvs(list);
        if (wantId && !active) {
          const found = list.find((c) => c.id === wantId);
          if (found) setActive(found);
        }
      });
  }, [user, wantId, active]);

  const peerId = useMemo(() => {
    if (!active || !user) return null;
    return active.user_a === user.id ? active.user_b : active.user_a;
  }, [active, user]);

  // Load messages + reactions + reads when conversation opens
  useEffect(() => {
    if (!active || !user) return;
    let alive = true;
    (async () => {
      const { data: m } = await supabase.from("messages").select("*").eq("conversation_id", active.id).order("created_at");
      if (!alive) return;
      const messages = (m ?? []) as Msg[];
      setMsgs(messages);

      const ids = messages.map((x) => x.id);
      if (ids.length) {
        const sb = supabase as unknown as { from: (t: string) => any };
        const [{ data: r }, { data: rd }] = await Promise.all([
          sb.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids),
          sb.from("message_reads").select("message_id, user_id").in("message_id", ids),
        ]);
        if (!alive) return;
        setReactions((r ?? []) as Reaction[]);
        const map: Record<string, string[]> = {};
        for (const row of (rd ?? []) as { message_id: string; user_id: string }[]) {
          (map[row.message_id] ??= []).push(row.user_id);
        }
        setReads(map);

        // Mark peer's messages as read
        const unread = messages.filter((x) => x.sender_id !== user.id && !(map[x.id] ?? []).includes(user.id));
        if (unread.length) {
          await sb.from("message_reads").insert(unread.map((x) => ({ message_id: x.id, user_id: user.id })));
        }
      }
    })();

    const ch = supabase
      .channel(`chat-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active.id}` },
        (p) => setMsgs((cur) => [...cur, p.new as Msg]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" },
        (p) => setReactions((cur) => [...cur, p.new as Reaction]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" },
        (p) => setReactions((cur) => cur.filter((r) => !(r.message_id === (p.old as Reaction).message_id && r.user_id === (p.old as Reaction).user_id && r.emoji === (p.old as Reaction).emoji))))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads" },
        (p) => {
          const row = p.new as { message_id: string; user_id: string };
          setReads((cur) => ({ ...cur, [row.message_id]: [...(cur[row.message_id] ?? []), row.user_id] }));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_indicators", filter: `conversation_id=eq.${active.id}` },
        (p) => {
          const row = (p.new ?? p.old) as { user_id: string; updated_at: string } | null;
          if (!row || row.user_id === user.id) return;
          const isRecent = new Date(row.updated_at).getTime() > Date.now() - 5000;
          setTypingPeer(isRecent && p.eventType !== "DELETE");
        })
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [active, user]);

  // Decay typing indicator
  useEffect(() => {
    if (!typingPeer) return;
    const t = setTimeout(() => setTypingPeer(false), 4000);
    return () => clearTimeout(t);
  }, [typingPeer]);

  const send = async () => {
    if (!active || !user || !draft.trim()) return;
    const content = scrubPII(draft.trim());
    setDraft("");
    await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, content });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
    // Clear typing
    const sb = supabase as unknown as { from: (t: string) => any };
    await sb.from("typing_indicators").delete().eq("conversation_id", active.id).eq("user_id", user.id);
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    if (!active || !user) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    const sb = supabase as unknown as { from: (t: string) => any };
    sb.from("typing_indicators").upsert({ conversation_id: active.id, user_id: user.id, updated_at: new Date().toISOString() });
    typingTimer.current = setTimeout(() => {
      sb.from("typing_indicators").delete().eq("conversation_id", active.id).eq("user_id", user.id);
    }, 3000);
  };

  const react = async (messageId: string, emoji: string) => {
    if (!user) return;
    const sb = supabase as unknown as { from: (t: string) => any };
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await sb.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await sb.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setPickerFor(null);
  };

  const reportPeer = async () => {
    if (!peerId || !user) return;
    const reason = window.prompt("Report reason?");
    if (!reason) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_user_id: peerId, reason });
    toast.success("Report submitted. Our team will review it.");
    setShowMenu(false);
  };
  const blockPeer = async () => {
    if (!peerId || !user) return;
    if (!confirm("Block this person? You won't see each other.")) return;
    await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: peerId });
    toast.success("Blocked.");
    setActive(null);
    setShowMenu(false);
  };
  const unmatch = async () => {
    if (!peerId || !user) return;
    if (!confirm("Unmatch? The conversation will be archived.")) return;
    const sb = supabase as unknown as { from: (t: string) => any };
    await sb.from("matches").update({ passed: true }).eq("user_id", user.id).eq("matched_user_id", peerId);
    toast.success("Unmatched.");
    setActive(null);
    setShowMenu(false);
  };

  if (loading || !user) {
    return <div className="min-h-screen"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  const fetchIcebreakers = async () => {
    if (!peerId) return;
    setIdeasLoading(true);
    setIdeasOpen(true);
    try {
      const res = await generateIcebreakers({ data: { peerId } });
      if ("error" in res) throw new Error(res.error);
      setIdeas(res.icebreakers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate icebreakers");
      setIdeasOpen(false);
    } finally {
      setIdeasLoading(false);
    }
  };


  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-border bg-card p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-luxury text-muted-foreground">Open threads</div>
          {convs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No conversations yet. Find someone in <Link to="/matches" className="text-primary">your band</Link>.
            </div>
          )}
          <div className="space-y-1">
            {convs.map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm transition-colors ${active?.id === c.id ? "bg-primary/15" : "hover:bg-surface"}`}>
                <MessageCircle className="h-4 w-4 text-accent" />
                <span className="truncate">Thread · {c.id.slice(0, 6)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[60vh] flex-col rounded-3xl border border-border bg-card">
          {!active ? (
            <div className="m-auto p-12 text-center text-muted-foreground">
              <h2 className="font-display text-2xl font-light">Select a thread</h2>
              <p className="mt-2 text-sm">Conversations unfold here — slow, intentional, voice-first.</p>
            </div>
          ) : (
            <>
              <div className="relative flex items-center justify-between border-b border-border p-4">
                <div className="text-sm font-medium">Thread · {active.id.slice(0, 6)}</div>
                <button onClick={() => setShowMenu((v) => !v)} className="rounded-full p-2 hover:bg-surface">
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-4 top-12 z-10 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
                    <button onClick={reportPeer} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><Flag className="h-4 w-4" /> Report</button>
                    <button onClick={blockPeer} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><Ban className="h-4 w-4" /> Block</button>
                    <button onClick={unmatch} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><UserX className="h-4 w-4" /> Unmatch</button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-6">
                {msgs.map((m) => {
                  const mine = m.sender_id === user.id;
                  const mReactions = reactions.filter((r) => r.message_id === m.id);
                  const seenByPeer = peerId ? (reads[m.id] ?? []).includes(peerId) : false;
                  return (
                    <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      <div className="relative flex items-end gap-1">
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-hero text-primary-foreground" : "bg-surface"}`}>
                          {m.content}
                        </div>
                        <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {pickerFor === m.id && (
                          <div className="absolute -top-10 right-0 z-10 flex gap-1 rounded-full border border-border bg-card p-1 shadow-glow">
                            {QUICK_EMOJI.map((e) => (
                              <button key={e} onClick={() => react(m.id, e)} className="rounded-full px-1.5 text-base hover:bg-surface">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {mReactions.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {Object.entries(mReactions.reduce<Record<string, number>>((acc, r) => { acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc; }, {})).map(([e, n]) => (
                            <button key={e} onClick={() => react(m.id, e)} className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                              {e} {n}
                            </button>
                          ))}
                        </div>
                      )}
                      {mine && (
                        <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          {seenByPeer ? <><CheckCheck className="h-3 w-3 text-primary" /> Seen</>
                            : m.delivered_at ? <><CheckCheck className="h-3 w-3" /> Delivered</>
                            : <><Check className="h-3 w-3" /> Sent</>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {typingPeer && (
                  <div className="px-2 text-xs italic text-muted-foreground">typing…</div>
                )}
                {msgs.length === 0 && <div className="text-center text-xs text-muted-foreground">Send the first thought.</div>}
              </div>

              {ideasOpen && (
                <div className="border-t border-border bg-surface/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-accent" /> AI Icebreakers
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={fetchIcebreakers} disabled={ideasLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] hover:bg-surface disabled:opacity-50">
                        <RefreshCw className={`h-3 w-3 ${ideasLoading ? "animate-spin" : ""}`} /> New
                      </button>
                      <button onClick={() => setIdeasOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Close</button>
                    </div>
                  </div>
                  {ideasLoading && ideas.length === 0 ? (
                    <div className="py-3 text-center text-xs text-muted-foreground">Reading your compatibility…</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ideas.map((i, idx) => (
                        <button key={idx} type="button"
                          onClick={() => { setDraft(i.text); setIdeasOpen(false); }}
                          className="max-w-full rounded-2xl border border-border bg-card px-3 py-2 text-left text-xs hover:border-primary">
                          <span className="mr-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase text-primary">{i.kind}</span>
                          {i.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2 border-t border-border p-4">
                <button type="button" onClick={fetchIcebreakers} disabled={!peerId || ideasLoading}
                  title="AI Icebreakers"
                  className="rounded-full border border-border bg-surface p-2 hover:border-primary disabled:opacity-50">
                  <Sparkles className="h-4 w-4 text-accent" />
                </button>
                <input value={draft} onChange={(e) => onDraftChange(e.target.value)}
                  placeholder="A thought, gently…"
                  className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
                <button type="submit" className="rounded-full bg-gradient-hero px-4 py-2 text-primary-foreground shadow-glow">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
                Phone numbers, emails, and social handles are auto-hidden until you both choose to share.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
