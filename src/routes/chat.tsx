import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Smile, MoreVertical, Flag, Ban, UserX, Check, CheckCheck, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateIcebreakers, type IcebreakerCategory } from "@/lib/icebreakers.functions";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { MessagePaywallModal } from "@/components/MessagePaywallModal";
import { ConversationScaffold } from "@/components/ConversationScaffold";
import { VerificationGate } from "@/components/VerificationGate";
import { useVerification } from "@/hooks/use-verification";
import { ProfileAvatar } from "@/components/ProfileAvatar";


const ICE_CATEGORIES: { id: IcebreakerCategory; label: string }[] = [
  { id: "fun", label: "Fun" },
  { id: "deep", label: "Deep" },
  { id: "romantic", label: "Romantic" },
  { id: "career", label: "Career" },
  { id: "travel", label: "Travel" },
  { id: "family", label: "Family" },
];

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Conversations — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: Chat,
});

type Conv = { id: string; user_a: string; user_b: string; last_message_at: string | null };
type Msg = { id: string; sender_id: string; content: string; created_at: string; delivered_at?: string | null };
type Reaction = { message_id: string; user_id: string; emoji: string };

const QUICK_EMOJI = ["❤️", "😂", "🔥", "👍", "🥺", "🎉"];

// Mirror of server-side enforce_contact_sharing regex so we can warn the user BEFORE they hit send.
const PII_PATTERNS: RegExp[] = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /(?:\+?\d[\s().-]*){7,}\d/,
  /(https?:\/\/|www\.)[a-z0-9.-]+/i,
  /\b(?:instagram|insta|ig|whatsapp|wa|telegram|tg|snapchat|snap|facebook|fb|tiktok|twitter|x\.com)\b[\s:@/]*[a-z0-9._-]+/i,
  /(^|\s)@[A-Za-z0-9._]{3,}/,
  /(wa\.me\/|t\.me\/|instagram\.com\/|fb\.com\/|facebook\.com\/|snapchat\.com\/)/i,
];
function looksLikeContactShare(s: string): boolean {
  return PII_PATTERNS.some((re) => re.test(s));
}

// PII detection/blocking now lives server-side in the enforce_contact_sharing trigger.
// Messages with phone/email/social handles are rejected with CONTACT_SHARING_LOCKED
// unless the pair has cleared the trust milestones.

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
  const [opener, setOpener] = useState<string>("");
  const [ideaCategory, setIdeaCategory] = useState<IcebreakerCategory | undefined>(undefined);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { quota, refresh: refreshQuota } = useMessageQuota();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ id: string; created_at: string } | null>(null);
  const [chatGate, setChatGate] = useState<{ enabled: boolean; placeholder?: string }>({ enabled: true });
  const [peerName, setPeerName] = useState<string>("them");
  const [peerProfile, setPeerProfile] = useState<{ avatar_url: string | null; photo_url: string | null; discovery_mode: "avatar" | "photo" | null } | null>(null);
  const verification = useVerification();
  const verifiedOk = verification.loading || verification.verified;


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

  // Look up the mutual match for this conversation so we can run the Day 1–4 scaffold.
  useEffect(() => {
    if (!user || !peerId) { setMatchInfo(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, created_at, mutual_interest, user_id, matched_user_id")
        .or(`and(user_id.eq.${user.id},matched_user_id.eq.${peerId}),and(user_id.eq.${peerId},matched_user_id.eq.${user.id})`)
        .eq("mutual_interest", true)
        .order("created_at", { ascending: true })
        .limit(1);
      if (!alive) return;
      const row = data?.[0];
      setMatchInfo(row ? { id: row.id, created_at: row.created_at } : null);

      const { data: prof } = await supabase.from("profiles").select("first_name, avatar_url, photo_url, discovery_mode").eq("id", peerId).maybeSingle();
      if (!alive) return;
      setPeerName(prof?.first_name ?? "them");
      setPeerProfile(prof ? { avatar_url: prof.avatar_url, photo_url: prof.photo_url, discovery_mode: (prof.discovery_mode as "avatar" | "photo" | null) ?? null } : null);
    })();

    return () => { alive = false; };
  }, [user, peerId]);

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
    if (!quota.unlimited && quota.remaining <= 0) {
      setPaywallOpen(true);
      return;
    }
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, content });
    if (error) {
      if (error.message?.includes("DAILY_MESSAGE_LIMIT_REACHED")) {
        setPaywallOpen(true);
        await refreshQuota();
        return;
      }
      if (error.message?.includes("CONTACT_SHARING_LOCKED")) {
        setDraft(content); // restore so user can edit
        toast.error("Contact sharing unlocks after trust milestones have been completed.");
        return;
      }
      toast.error(error.message);
      return;
    }
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
    const sb = supabase as unknown as { from: (t: string) => any };
    await sb.from("typing_indicators").delete().eq("conversation_id", active.id).eq("user_id", user.id);
    refreshQuota();
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

  const fetchIcebreakers = async (category?: IcebreakerCategory) => {
    if (!peerId) return;
    setIdeaCategory(category);
    setIdeasLoading(true);
    setIdeasOpen(true);
    try {
      const res = await generateIcebreakers({ data: { peerId, category } });
      if ("error" in res) throw new Error(res.error);
      setIdeas(res.icebreakers);
      setOpener(res.suggestedOpener);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate icebreakers");
    } finally {
      setIdeasLoading(false);
    }
  };



  return (
    <div className="min-h-screen">
      <UnveilNav />
      <MessagePaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-[320px_1fr]">
        {!quota.loading && !quota.unlimited && (
          <div className="md:col-span-2 -mb-2 rounded-2xl border border-border bg-surface/60 px-4 py-2 text-xs text-muted-foreground">
            {quota.remaining} of {quota.dailyLimit} free messages remaining today.
            {" "}
            <Link to="/checkout" search={{ product: "message_pass" } as any} className="text-accent underline">Unlock 24h pass for $1.99</Link>
            {" · "}
            <Link to="/premium" className="text-primary underline">Go Premium</Link>
          </div>
        )}
        {!quota.loading && quota.unlimited && quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date() && (
          <div className="md:col-span-2 -mb-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent">
            Unlimited messaging active · {formatRemainingTime(quota.messagePassUntil)} remaining on your Daily Pass.
          </div>
        )}
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
                <div className="flex items-center gap-3">
                  {peerId && (
                    <ProfileAvatar
                      userId={peerId}
                      name={peerName}
                      discoveryMode={peerProfile?.discovery_mode}
                      avatarUrl={peerProfile?.avatar_url}
                      photoUrl={peerProfile?.photo_url}
                      size={40}
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium leading-tight">{peerName}</div>
                    <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Slow reveal · in progress</div>
                  </div>
                </div>
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


              {matchInfo && user && peerId && (
                <ConversationScaffold
                  matchId={matchInfo.id}
                  matchCreatedAt={matchInfo.created_at}
                  selfId={user.id}
                  peerId={peerId}
                  peerName={peerName}
                  onChatGateChange={(enabled, placeholder) => setChatGate({ enabled, placeholder })}
                />
              )}



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
                {msgs.length === 0 && <div className="px-4 py-6 text-center text-xs italic text-muted-foreground">Your conversation is unfolding. Send the first thought when you're ready.</div>}
              </div>

              {ideasOpen && (
                <div className="border-t border-border bg-surface/50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-accent" /> AI Icebreakers
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => fetchIcebreakers(ideaCategory)} disabled={ideasLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] hover:bg-surface disabled:opacity-50">
                        <RefreshCw className={`h-3 w-3 ${ideasLoading ? "animate-spin" : ""}`} /> Generate New
                      </button>
                      <button onClick={() => setIdeasOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Close</button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => fetchIcebreakers(undefined)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${!ideaCategory ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >Mix</button>
                    {ICE_CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => fetchIcebreakers(c.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${ideaCategory === c.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {opener && !ideasLoading && (
                    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-luxury text-accent">AI Suggested Opening Message</span>
                        <button onClick={() => { setDraft(opener); setIdeasOpen(false); }}
                          className="rounded-full bg-gradient-hero px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">Use this</button>
                      </div>
                      <p className="text-xs leading-relaxed">{opener}</p>
                    </div>
                  )}

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

              {!verification.loading && !verification.verified && (
                <div className="border-t border-border p-4">
                  <VerificationGate
                    status={verification.status}
                    variant="inline"
                    reason="Verified members only can send and reply to messages."
                  />
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); if (chatGate.enabled && verifiedOk) send(); }}
                className="flex items-center gap-2 border-t border-border p-4">
                <button type="button" onClick={() => fetchIcebreakers(ideaCategory)} disabled={!peerId || ideasLoading || !chatGate.enabled || !verifiedOk}
                  title="AI Icebreakers"
                  className="rounded-full border border-border bg-surface p-2 hover:border-primary disabled:opacity-50">
                  <Sparkles className="h-4 w-4 text-accent" />
                </button>
                <input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  disabled={!chatGate.enabled || !verifiedOk}
                  placeholder={!verifiedOk ? "Verification required to message" : chatGate.enabled ? "A thought, gently…" : (chatGate.placeholder ?? "Chat is locked until your slow reveal unlocks it")}
                  className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                />
                <button type="submit" disabled={!chatGate.enabled || !verifiedOk} className="rounded-full bg-gradient-hero px-4 py-2 text-primary-foreground shadow-glow disabled:opacity-50">
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
