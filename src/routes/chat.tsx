import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Send, Smile, MoreVertical, Flag, Ban, UserX,
  Check, CheckCheck, Sparkles, RefreshCw, ChevronLeft, ChevronDown,
  Heart, Lock as LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { generateIcebreakers, type IcebreakerCategory } from "@/lib/icebreakers.functions";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { MessagePaywallModal } from "@/components/MessagePaywallModal";
import { ConversationScaffold } from "@/components/ConversationScaffold";
import { ContactRevealPanel } from "@/components/ContactRevealPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { loadCompatibility, bandLabel } from "@/lib/matching-api";

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
type PeerProfile = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  discovery_mode: "avatar" | "photo" | null;
  verified: boolean | null;
  last_active_at: string | null;
};
type Compat = Awaited<ReturnType<typeof loadCompatibility>>;

const QUICK_EMOJI = ["❤️", "😂", "🔥", "👍", "🥺", "🎉"];

const PII_PATTERNS: RegExp[] = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /(?:\+?\d[\s().-]*){7,}\d/,
  /(https?:\/\/|www\.)[a-z0-9.-]+/i,
  /\b(?:instagram|insta|ig|whatsapp|wa|telegram|tg|snapchat|snap|facebook|fb|tiktok|twitter|x\.com)\b[\s:@/]*[a-z0-9._-]+/i,
  /(^|\s)@[A-Za-z0-9._]{3,}/,
  /(wa\.me\/|t\.me\/|instagram\.com\/|fb\.com\/|facebook\.com\/|snapchat\.com\/)/i,
];
const looksLikeContactShare = (s: string) => PII_PATTERNS.some((re) => re.test(s));

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(1, Math.min(7, Math.floor(ms / 86_400_000) + 1));
}

function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { c: wantId } = Route.useSearch();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [peers, setPeers] = useState<Record<string, PeerProfile>>({});
  const [convCompat, setConvCompat] = useState<Record<string, number>>({});
  const [convLastMsg, setConvLastMsg] = useState<Record<string, string>>({});
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
  const [scaffoldOpen, setScaffoldOpen] = useState(false);
  const [compatOpen, setCompatOpen] = useState(true);
  const [revealOpen, setRevealOpen] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { quota, refresh: refreshQuota } = useMessageQuota();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ id: string; created_at: string } | null>(null);
  const [compat, setCompat] = useState<Compat | null>(null);
  const [contactShareUnlocked, setContactShareUnlocked] = useState<boolean>(false);

  const draftLooksLikeContact = useMemo(() => looksLikeContactShare(draft), [draft]);
  const showContactWarning = draftLooksLikeContact && !contactShareUnlocked;

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  // Load conversations + peer profiles + last messages + per-conv compatibility
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      const list = (data ?? []) as Conv[];
      if (!alive) return;
      setConvs(list);
      if (wantId && !active) {
        const found = list.find((c) => c.id === wantId);
        if (found) setActive(found);
      }
      const peerIds = list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
      const convIds = list.map((c) => c.id);
      if (peerIds.length) {
        const [{ data: profs }, { data: lastMsgs }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, first_name, avatar_url, photo_url, discovery_mode, verified, last_active_at")
            .in("id", peerIds),
          supabase
            .from("messages")
            .select("conversation_id, content, created_at")
            .in("conversation_id", convIds)
            .order("created_at", { ascending: false }),
        ]);
        if (!alive) return;
        const pmap: Record<string, PeerProfile> = {};
        for (const p of (profs ?? []) as PeerProfile[]) pmap[p.id] = p;
        setPeers(pmap);
        const last: Record<string, string> = {};
        for (const m of (lastMsgs ?? []) as { conversation_id: string; content: string }[]) {
          if (!last[m.conversation_id]) last[m.conversation_id] = m.content;
        }
        setConvLastMsg(last);

        // Per-conversation compatibility (best-effort, ignore failures)
        const compatEntries = await Promise.all(
          list.map(async (c) => {
            const peer = c.user_a === user.id ? c.user_b : c.user_a;
            try {
              const row = await loadCompatibility(peer);
              return [c.id, row?.overall ?? 0] as const;
            } catch { return [c.id, 0] as const; }
          })
        );
        if (!alive) return;
        const cmap: Record<string, number> = {};
        for (const [cid, n] of compatEntries) if (n) cmap[cid] = n;
        setConvCompat(cmap);
      }
    })();
    return () => { alive = false; };
  }, [user, wantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const peerId = useMemo(() => {
    if (!active || !user) return null;
    return active.user_a === user.id ? active.user_b : active.user_a;
  }, [active, user]);

  const peer = peerId ? peers[peerId] : null;
  const peerName = peer?.first_name ?? "Match";

  // Match info + compatibility for the active conversation
  useEffect(() => {
    if (!user || !peerId) { setMatchInfo(null); setCompat(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, created_at")
        .or(`and(user_id.eq.${user.id},matched_user_id.eq.${peerId}),and(user_id.eq.${peerId},matched_user_id.eq.${user.id})`)
        .eq("mutual_interest", true)
        .order("created_at", { ascending: true })
        .limit(1);
      if (!alive) return;
      const row = data?.[0];
      setMatchInfo(row ? { id: row.id, created_at: row.created_at } : null);

      const c = await loadCompatibility(peerId);
      if (!alive) return;
      setCompat(c);

      const { data: canShare } = await (supabase as any).rpc("can_share_contacts", { _a: user.id, _b: peerId });
      if (!alive) return;
      setContactShareUnlocked(!!canShare);
    })();
    return () => { alive = false; };
  }, [user, peerId]);

  // Load + subscribe messages for active conversation
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

  useEffect(() => {
    if (!typingPeer) return;
    const t = setTimeout(() => setTypingPeer(false), 4000);
    return () => clearTimeout(t);
  }, [typingPeer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, typingPeer]);

  const send = async () => {
    if (!active || !user || !draft.trim()) return;
    if (!quota.unlimited && quota.remaining <= 0) { setPaywallOpen(true); return; }
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, content });
    if (error) {
      if (error.message?.includes("DAILY_MESSAGE_LIMIT_REACHED")) { setPaywallOpen(true); await refreshQuota(); return; }
      if (error.message?.includes("CONTACT_SHARING_LOCKED")) {
        setDraft(content);
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
    if (existing) await sb.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
    else await sb.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    setPickerFor(null);
  };

  const reportPeer = async () => {
    if (!peerId || !user) return;
    const reason = window.prompt("Report reason?");
    if (!reason) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_user_id: peerId, reason });
    toast.success("Report submitted.");
    setShowMenu(false);
  };
  const blockPeer = async () => {
    if (!peerId || !user) return;
    if (!confirm("Block this person?")) return;
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

  if (loading || !user) {
    return <div className="min-h-screen"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  const dayN = matchInfo ? daysSince(matchInfo.created_at) : null;
  const overallScore = compat?.overall ?? null;
  const band = overallScore != null ? bandLabel(overallScore) : null;
  const metrics = compat
    ? [
        { label: "Values", value: compat.values_score ?? 0 },
        { label: "Lifestyle", value: compat.lifestyle ?? 0 },
        { label: "Communication", value: compat.communication ?? 0 },
        { label: "Future Goals", value: compat.goals ?? 0 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <UnveilNav />
      <MessagePaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />

      <div className="mx-auto flex w-full max-w-7xl gap-0 px-0 lg:gap-4 lg:px-6 lg:py-4">
        {/* ============ SIDEBAR / MATCH LIST ============ */}
        <aside
          className={`${active ? "hidden" : "flex"} lg:flex w-full lg:w-[340px] shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl lg:rounded-3xl lg:border lg:bg-card/60`}
          style={{ height: "calc(100vh - 64px)" }}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h1 className="font-display text-xl font-light tracking-tight">Messages</h1>
              <p className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                {convs.length} {convs.length === 1 ? "match" : "matches"}
              </p>
            </div>
            <Link to="/matches" className="rounded-full bg-gradient-hero p-2 text-primary-foreground shadow-glow">
              <Heart className="h-4 w-4" />
            </Link>
          </div>

          {!quota.loading && !quota.unlimited && (
            <div className="border-b border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
              {quota.remaining}/{quota.dailyLimit} messages today ·{" "}
              <Link to="/checkout" search={{ product: "message_pass" } as any} className="text-accent underline">Unlock</Link>
            </div>
          )}
          {!quota.loading && quota.unlimited && quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date() && (
            <div className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-[11px] text-accent">
              Unlimited · {formatRemainingTime(quota.messagePassUntil)} left
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {convs.length === 0 ? (
              <div className="m-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No conversations yet. <Link to="/matches" className="text-primary">Find your band</Link>.
              </div>
            ) : convs.map((c) => {
              const pid = c.user_a === user.id ? c.user_b : c.user_a;
              const p = peers[pid];
              const pct = convCompat[c.id];
              const isActive = active?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`group mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                    isActive ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-surface"
                  }`}
                >
                  <div className="relative">
                    <ProfileAvatar
                      userId={pid}
                      name={p?.first_name}
                      discoveryMode={p?.discovery_mode}
                      avatarUrl={p?.avatar_url}
                      photoUrl={p?.photo_url}
                      size={52}
                    />
                    {pct ? (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-gradient-hero px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary-foreground shadow-glow">
                        {pct}%
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate text-sm font-medium">
                        {p?.first_name ?? "Match"}
                        {p?.verified ? <VerifiedBadge size="xs" /> : null}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {convLastMsg[c.id] ?? "Say hi"}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground/80">
                        Active {timeAgo(p?.last_active_at ?? null)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ============ CHAT PANEL ============ */}
        <section
          className={`${active ? "flex" : "hidden"} lg:flex relative min-w-0 flex-1 flex-col bg-card/40 backdrop-blur-xl lg:rounded-3xl lg:border lg:border-border lg:bg-card/60`}
          style={{ height: "calc(100vh - 64px)" }}
        >
          {!active ? (
            <div className="m-auto p-12 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary/40" />
              <h2 className="font-display text-2xl font-light">Select a conversation</h2>
              <p className="mt-2 text-sm">Slow, intentional, voice-first.</p>
            </div>
          ) : (
            <>
              {/* ============ COMPACT HEADER ============ */}
              <header className="relative shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setActive(null)}
                    className="rounded-full p-1.5 hover:bg-surface lg:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {peerId && (
                    <ProfileAvatar
                      userId={peerId}
                      name={peerName}
                      discoveryMode={peer?.discovery_mode}
                      avatarUrl={peer?.avatar_url}
                      photoUrl={peer?.photo_url}
                      size={48}
                      className="ring-2 ring-primary/40"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base font-semibold">{peerName}</span>
                      {peer?.verified ? <VerifiedBadge size="xs" /> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {overallScore != null && band && (
                        <span className={`font-mono font-semibold ${band.tone}`}>
                          {overallScore}% · {band.label}
                        </span>
                      )}
                      {dayN && <span>· Day {dayN} of 7</span>}
                      {typingPeer && <span className="italic text-primary">typing…</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="rounded-full p-2 hover:bg-surface"
                    aria-label="More"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-4 top-16 z-20 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
                      <button onClick={reportPeer} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><Flag className="h-4 w-4" /> Report</button>
                      <button onClick={blockPeer} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><Ban className="h-4 w-4" /> Block</button>
                      <button onClick={unmatch} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><UserX className="h-4 w-4" /> Unmatch</button>
                    </div>
                  )}
                </div>

                {/* Day progress bar */}
                {dayN && (
                  <div className="px-4 pb-2">
                    <div className="h-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-gradient-hero transition-all"
                        style={{ width: `${(dayN / 7) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Compatibility dashboard (collapsible) */}
                {metrics.length > 0 && (
                  <div className="border-t border-border/40">
                    <button
                      onClick={() => setCompatOpen((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                        Why you match
                      </span>
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${compatOpen ? "rotate-180" : ""}`} />
                    </button>
                    {compatOpen && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-3">
                        {metrics.map((m) => (
                          <div key={m.label}>
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">{m.label}</span>
                              <span className="font-mono text-[11px] font-semibold">{m.value}%</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-surface">
                              <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${Math.max(4, m.value)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible discovery cards */}
                {matchInfo && peerId && (
                  <div className="border-t border-border/40 px-4 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setScaffoldOpen((v) => !v)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors ${
                          scaffoldOpen ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="h-3 w-3" /> Discovery prompts
                      </button>
                      <button
                        onClick={() => setRevealOpen((v) => !v)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors ${
                          revealOpen ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <LockIcon className="h-3 w-3" /> Contact reveal
                      </button>
                      <button
                        onClick={() => fetchIcebreakers(ideaCategory)}
                        disabled={ideasLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${ideasLoading ? "animate-spin" : ""}`} /> Icebreakers
                      </button>
                    </div>
                    {scaffoldOpen && (
                      <div className="mt-2 rounded-2xl border border-border bg-surface/40 p-3">
                        <ConversationScaffold
                          matchId={matchInfo.id}
                          matchCreatedAt={matchInfo.created_at}
                          selfId={user.id}
                          peerId={peerId}
                          peerName={peerName}
                          onChatGateChange={() => { /* DB trigger is source of truth */ }}
                        />
                      </div>
                    )}
                    {revealOpen && (
                      <div className="mt-2 rounded-2xl border border-border bg-surface/40 p-3">
                        <ContactRevealPanel peerUserId={peerId} peerName={peerName} />
                      </div>
                    )}
                  </div>
                )}
              </header>

              {/* ============ MESSAGES (dominant, ≥70% of column) ============ */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {msgs.length === 0 && (
                  <div className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">
                    <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary/60" />
                    Your conversation is unfolding. Send the first thought when you're ready.
                  </div>
                )}
                <div className="space-y-2">
                  {msgs.map((m, idx) => {
                    const mine = m.sender_id === user.id;
                    const mReactions = reactions.filter((r) => r.message_id === m.id);
                    const seenByPeer = peerId ? (reads[m.id] ?? []).includes(peerId) : false;
                    const prev = msgs[idx - 1];
                    const grouped = prev && prev.sender_id === m.sender_id && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000);
                    return (
                      <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "mt-0.5" : "mt-2"}`}>
                        <div className="relative flex items-end gap-1">
                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                              mine
                                ? "bg-gradient-hero text-primary-foreground rounded-br-md"
                                : "bg-surface text-foreground rounded-bl-md"
                            }`}
                          >
                            {m.content}
                          </div>
                          <button
                            onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="React"
                          >
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
                    <div className="flex items-center gap-1 px-2">
                      <span className="inline-flex gap-1 rounded-2xl bg-surface px-3 py-2">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* ============ ICEBREAKERS DRAWER ============ */}
              {ideasOpen && (
                <div className="shrink-0 border-t border-border bg-surface/60 p-3 backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-accent" /> AI Icebreakers
                    </div>
                    <button onClick={() => setIdeasOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Close</button>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button onClick={() => fetchIcebreakers(undefined)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${!ideaCategory ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>Mix</button>
                    {ICE_CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => fetchIcebreakers(c.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${ideaCategory === c.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {opener && !ideasLoading && (
                    <div className="mb-2 rounded-2xl border border-accent/40 bg-accent/10 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-luxury text-accent">Suggested opener</span>
                        <button onClick={() => { setDraft(opener); setIdeasOpen(false); }}
                          className="rounded-full bg-gradient-hero px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">Use</button>
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

              {showContactWarning && (
                <div className="shrink-0 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
                  Contact sharing unlocks after Day 7 + both verified (or Premium).
                </div>
              )}

              {/* ============ COMPOSER (fixed to bottom of panel) ============ */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="shrink-0 border-t border-border bg-card/90 p-3 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchIcebreakers(ideaCategory)}
                    disabled={!peerId || ideasLoading}
                    title="AI Icebreakers"
                    className="rounded-full border border-border bg-surface p-2.5 hover:border-primary disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    placeholder={`Message ${peerName}…`}
                    className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="rounded-full bg-gradient-hero p-2.5 text-primary-foreground shadow-glow disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                  Phone numbers, emails, and social handles are hidden until you both choose to share.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
