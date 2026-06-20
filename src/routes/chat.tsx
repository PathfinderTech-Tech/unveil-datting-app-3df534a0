import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/use-presence";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Send, Smile, MoreVertical, Flag, Ban, UserX,
  Check, CheckCheck, Sparkles, RefreshCw,
  Lock as LockIcon, ChevronRight, Search, Plus,
  Heart as HeartIcon, Calendar, MessageSquare, Phone,
} from "lucide-react";
import { ConversationHeaderLuxe } from "@/components/chat/ConversationHeaderLuxe";
import { RevealProgressCard } from "@/components/chat/RevealProgressCard";
import { QuickActionBar } from "@/components/chat/QuickActionBar";

import { toast } from "sonner";
import { generateIcebreakers, type IcebreakerCategory } from "@/lib/icebreakers.functions";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { MessagePaywallModal } from "@/components/MessagePaywallModal";
import { SelfieVerifyModal } from "@/components/SelfieVerifyModal";
import { useVerification } from "@/hooks/use-verification";
import { ConversationScaffold } from "@/components/ConversationScaffold";
import { ContactRevealPanel } from "@/components/ContactRevealPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

import { VoiceMessageRecorder } from "@/components/VoiceMessageRecorder";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";
import { loadCompatibility, bandLabel } from "@/lib/matching-api";
import { getPrimaryProfileMedia } from "@/lib/profile-media.functions";
import { ReportUserDialog, blockUser } from "@/components/ReportUserDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { AiCompatibilityPanel } from "@/components/AiCompatibilityPanel";
import { GiftPickerSheet } from "@/components/GiftPickerSheet";
import { GiftMessageBubble } from "@/components/GiftMessageBubble";
// ConnectionProgress / DateReadinessProgress removed — replaced by RevealProgressCard
import { DateReadinessPanel } from "@/components/DateReadinessPanel";
import { useMatchReveal } from "@/lib/reveal";


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
type Msg = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  delivered_at?: string | null;
  message_type?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  duration_seconds?: number | null;
};
type Reaction = { message_id: string; user_id: string; emoji: string };
type PeerProfile = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  discovery_mode: "avatar" | "photo" | null;
  verified: boolean | null;
  last_seen_at: string | null;
};
type PeerRow = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  profile_photo_url: string | null;
  verified: boolean | null;
  updated_at: string | null;
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
  const [reportOpen, setReportOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ text: string; kind: string }[]>([]);
  const [opener, setOpener] = useState<string>("");
  const [ideaCategory, setIdeaCategory] = useState<IcebreakerCategory | undefined>(undefined);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  // (legacy collapsible state replaced by unified panel below)
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"insights" | "ai" | "discovery" | "icebreakers" | "reveal">("insights");
  const [giftOpen, setGiftOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "d13" | "d47" | "locked">("all");
  const isMobile = useIsMobile();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { quota, refresh: refreshQuota } = useMessageQuota();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { verified } = useVerification();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const VERIFY_THRESHOLD = 10;
  const mustVerify = !verified && sentCount >= VERIFY_THRESHOLD;

  // Load total messages sent by this user (text + voice) to know when to
  // trigger the selfie verification gate (after VERIFY_THRESHOLD sends).
  useEffect(() => {
    if (!user || verified) return;
    let alive = true;
    (async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id);
      if (alive && typeof count === "number") setSentCount(count);
    })();
    return () => { alive = false; };
  }, [user, verified]);
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
      if (wantId) {
        const found = list.find((c) => c.id === wantId);
        if (found) setActive((prev) => (prev?.id === found.id ? prev : found));
      }
      const peerIds = list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
      const convIds = list.map((c) => c.id);
      if (peerIds.length) {
        const [{ data: profs }, mediaRows, { data: lastMsgs }] = await Promise.all([
          (supabase as any).rpc("get_public_match_profiles", { _targets: peerIds }),
          getPrimaryProfileMedia({ data: { userIds: peerIds } }),
          supabase
            .from("messages")
            .select("conversation_id, content, created_at")
            .in("conversation_id", convIds)
            .order("created_at", { ascending: false }),
        ]);
        if (!alive) return;
        const mediaMap = new Map(mediaRows.map((m) => [m.id, m]));
        const pmap: Record<string, PeerProfile> = {};
        for (const p of (profs ?? []) as (PeerRow & { profile_photo_url: string | null })[]) {
          const media = mediaMap.get(p.id);
          pmap[p.id] = {
            id: p.id,
            first_name: media?.firstName ?? p.first_name?.trim() ?? null,
            avatar_url: media?.avatarUrl ?? p.avatar_url,
            photo_url: media?.photoUrl ?? p.profile_photo_url ?? p.photo_url,
            discovery_mode: media?.hasUploadedPhoto ? "photo" : null,
            verified: p.verified,
            last_seen_at: p.updated_at,
          };
        }
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

  // Keep `active` in sync with `?c=` and the loaded conversation list.
  useEffect(() => {
    if (!wantId) return;
    const found = convs.find((c) => c.id === wantId);
    if (found && active?.id !== found.id) setActive(found);
  }, [wantId, convs, active?.id]);

  // Remember the active conversation so Insights → Back to Messages
  // can return the user directly to the chat they came from.
  useEffect(() => {
    if (active?.id) {
      void import("@/lib/last-conversation").then((m) => m.rememberConversation(active.id));
    }
  }, [active?.id]);

  const peerId = useMemo(() => {
    if (!active || !user) return null;
    return active.user_a === user.id ? active.user_b : active.user_a;
  }, [active, user]);

  const peer = peerId ? peers[peerId] : null;
  const peerName = peer?.first_name ?? "Match";
  const reveal = useMatchReveal(peerId);

  // One-time "Veil Lifted" celebration — persisted across sessions so the
  // receiving user always sees it once, even if they were offline when it flipped.
  const veilCelebratedRef = useRef<string | null>(null);
  const [veilJustLifted, setVeilJustLifted] = useState(false);
  useEffect(() => {
    if (!peerId || !reveal.veilLifted || !user?.id) return;
    if (veilCelebratedRef.current === peerId) return;
    const storageKey = `unveil:veil-celebrated:${user.id}:${peerId}`;
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(storageKey)) {
        veilCelebratedRef.current = peerId;
        return;
      }
    } catch { /* localStorage may be unavailable */ }
    veilCelebratedRef.current = peerId;
    setVeilJustLifted(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, String(Date.now()));
      }
    } catch { /* ignore */ }
  }, [peerId, reveal.veilLifted, reveal.veilLiftedAt, user?.id]);


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
    if (mustVerify) { setVerifyOpen(true); return; }
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
    if (!verified) {
      setSentCount((n) => {
        const next = n + 1;
        if (next >= VERIFY_THRESHOLD) setVerifyOpen(true);
        return next;
      });
    }
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

  const openReport = () => {
    if (!peerId || !user) return;
    setShowMenu(false);
    setReportOpen(true);
  };
  const blockPeer = async () => {
    if (!peerId || !user) return;
    if (!confirm("Block this person? They won't be able to contact you again.")) return;
    try {
      await blockUser(peerId);
      toast.success("Blocked. They can no longer contact you.");
      setActive(null);
      setShowMenu(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't block");
    }
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
        { label: "Communication", value: compat.communication ?? 0 },
        { label: "Lifestyle", value: compat.lifestyle ?? 0 },
        { label: "Future Goals", value: compat.goals ?? 0 },
      ]
    : [];

  // Derive "Why You Matched" insights from compatibility metrics
  const insights: string[] = [];
  if (compat) {
    const v = compat.values_score ?? 0;
    const c = compat.communication ?? 0;
    const l = compat.lifestyle ?? 0;
    const g = compat.goals ?? 0;
    if (v >= 75) insights.push("Both value honesty and authenticity");
    if (c >= 75) insights.push("Both prefer meaningful conversations");
    if (l >= 75) insights.push("Aligned daily rhythms and lifestyle");
    if (g >= 75) insights.push("Both want intentional relationships");
    if (insights.length === 0) {
      // fallback: surface the top two metrics
      const top = [...metrics].sort((a, b) => b.value - a.value).slice(0, 2);
      for (const t of top) insights.push(`Strong overlap on ${t.label.toLowerCase()}`);
    }
  }

  // Real-time presence: peer is "online now" only while their client
  // is actively connected to the shared Realtime presence channel.
  // Falls back to `Active Xm ago` (from last_seen_at) once they leave.
  const { isOnline: isUserOnline } = usePresence();
  const isOnline = (peerId: string | null | undefined) => isUserOnline(peerId);

  const SUGGESTED_OPENERS = [
    "What does your ideal Sunday look like?",
    "What's one value you'd never compromise on?",
    "What are you currently building in your life?",
  ];

  return (
    <div className="flex h-[100dvh] flex-col bg-background overflow-hidden">
      <UnveilNav />
      <MessagePaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        dailyLimit={quota.dailyLimit}
        isPremium={quota.dailyLimit >= 35}
        returnTo={active ? `/chat?c=${active.id}` : "/chat"}
      />
      <SelfieVerifyModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        returnTo={active ? `/chat?c=${active.id}` : "/chat"}
      />
      {peerId && (
        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportedUserId={peerId}
          onBlockToo={blockPeer}
        />
      )}
      {peerId && (
        <GiftPickerSheet
          open={giftOpen}
          onClose={() => setGiftOpen(false)}
          peerId={peerId}
          peerName={peerName}
        />
      )}


      <div className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 gap-0 px-0 lg:gap-5 lg:px-6 lg:py-4">
        {/* ============ SIDEBAR / MATCH LIST ============ */}
        <aside
          className={`${active ? "hidden" : "flex"} lg:flex w-full lg:w-[360px] shrink-0 flex-col min-h-0 h-full border-r border-border/50 bg-card/30 backdrop-blur-2xl lg:rounded-3xl lg:border lg:border-border/60 lg:bg-card/50 lg:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)]`}
        >
        >
          <div className="border-b border-border/40 px-5 pt-3 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-border/60 bg-surface/60 py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                ["all","All"],["active","Active"],["d13","Day 1-3"],["d47","Day 4-7"],["locked","Locked"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    filter === k
                      ? "bg-gradient-hero text-primary-foreground shadow-glow"
                      : "border border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!quota.loading && !quota.unlimited && (
            <div className="border-b border-border/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">{quota.remaining}</span> of {quota.dailyLimit} interactions remaining today ·{" "}
              <button onClick={() => setPaywallOpen(true)} className="text-accent underline-offset-2 hover:underline">Unlock</button>
            </div>
          )}
          {!quota.loading && quota.unlimited && quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date() && (
            <div className="border-b border-accent/30 bg-accent/10 px-5 py-2.5 text-[11px] text-accent">
              ✦ Unlimited interactions · {formatRemainingTime(quota.messagePassUntil)} left
            </div>
          )}
          {!quota.loading && quota.unlimited && !(quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date()) && (
            <div className="border-b border-border/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              ✦ Unlimited interactions
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2.5">
            {(() => {
              const q = search.trim().toLowerCase();
              const filtered = convs.filter((c) => {
                const pid = c.user_a === user.id ? c.user_b : c.user_a;
                const p = peers[pid];
                if (q && !(p?.first_name ?? "").toLowerCase().includes(q)) return false;
                if (filter === "active") return isOnline(pid);
                if (filter === "locked") return !convLastMsg[c.id];
                // d13 / d47 best-effort: based on last message age
                if (filter === "d13" || filter === "d47") {
                  if (!c.last_message_at) return false;
                  const d = Math.floor((Date.now() - new Date(c.last_message_at).getTime()) / 86_400_000) + 1;
                  return filter === "d13" ? d <= 3 : d >= 4 && d <= 7;
                }
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <div className="m-2 rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    {convs.length === 0 ? <>No conversations yet. <Link to="/matches" className="text-primary">Find your band</Link>.</> : "No conversations match this filter."}
                  </div>
                );
              }
              return filtered.map((c) => {
              const pid = c.user_a === user.id ? c.user_b : c.user_a;
              const p = peers[pid];
              const pct = convCompat[c.id];
              const isActive = active?.id === c.id;
              const online = isOnline(pid);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActive(c);
                    navigate({ to: "/chat", search: { c: c.id }, replace: true });
                  }}
                  className={`group mb-1.5 flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-accent/10 ring-1 ring-primary/40 shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.4)]"
                      : "hover:bg-surface/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="rounded-full ring-2 ring-border/40 ring-offset-2 ring-offset-background/0 transition-all group-hover:ring-primary/30">
                      <ProfileAvatar
                        userId={pid}
                        name={p?.first_name}
                        discoveryMode={p?.discovery_mode}
                        avatarUrl={p?.avatar_url}
                        photoUrl={p?.photo_url}
                        size={56}
                        veiled={!convLastMsg[c.id]}
                      />
                    </div>
                    {pct ? (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-gradient-hero px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary-foreground shadow-glow ring-2 ring-card">
                        {pct}%
                      </span>
                    ) : null}
                    {online && (
                      <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_2px_hsl(var(--card)),0_0_10px_rgba(52,211,153,0.6)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate text-[15px] font-semibold tracking-tight">
                        {p?.first_name ?? "Match"}
                        {p?.verified ? <VerifiedBadge size="xs" /> : null}


                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {convLastMsg[c.id] ?? "Say hi"}
                      </p>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] ${online ? "font-medium text-emerald-400" : "text-muted-foreground"}`}>
                        {online ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                            Online now
                          </>
                        ) : p?.last_seen_at ? `Active ${timeAgo(p.last_seen_at)} ago` : ""}
                      </span>
                    </div>
                  </div>
                </button>
              );
            });
            })()}
          </div>
        </aside>

        {/* ============ CHAT PANEL ============ */}
        <section
          className={`${active ? "flex" : "hidden"} lg:flex relative min-w-0 flex-1 flex-col bg-card/30 backdrop-blur-2xl lg:rounded-3xl lg:border lg:border-border/60 lg:bg-card/50 lg:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)]`}
          style={{ height: "calc(100dvh - 72px)" }}
        >
          {!active ? (
            <div className="m-auto p-12 text-center text-muted-foreground">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/10 backdrop-blur-xl">
                <MessageCircle className="h-7 w-7 text-primary/70" />
              </div>
              <h2 className="font-display text-2xl font-light tracking-tight">Select a conversation</h2>
              <p className="mt-2 text-sm text-muted-foreground">Slow, intentional, voice-first.</p>
            </div>
          ) : (
            <>
              {/* ============ LUXURY HEADER ============ */}
              {peerId && (
                <div className="relative">
                  <ConversationHeaderLuxe
                    peerId={peerId}
                    peerName={peerName}
                    peerAvatarUrl={peer?.avatar_url}
                    peerPhotoUrl={peer?.photo_url}
                    peerDiscoveryMode={peer?.discovery_mode}
                    verified={!!peer?.verified}
                    isOnline={isOnline(peerId)}
                    veilLifted={reveal.veilLifted}
                    compatibility={overallScore}
                    messagesRemaining={quota.unlimited ? 99 : quota.remaining}
                    onBack={() => {
                      setActive(null);
                      navigate({ to: "/chat", search: {}, replace: true });
                    }}
                    onReport={openReport}
                    onMenu={() => setShowMenu((v) => !v)}
                  />
                  {showMenu && (
                    <div className="absolute right-4 top-[88px] z-30 w-44 overflow-hidden rounded-2xl border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.11_0.04_298/0.95)] shadow-[0_20px_60px_-15px_oklch(0_0_0/0.6)] backdrop-blur-2xl">
                      <button onClick={openReport} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[oklch(0.18_0.07_298/0.6)]"><Flag className="h-4 w-4" /> Report</button>
                      <button onClick={blockPeer} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[oklch(0.18_0.07_298/0.6)]"><Ban className="h-4 w-4" /> Block</button>
                      <button onClick={unmatch} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[oklch(0.18_0.07_298/0.6)]"><UserX className="h-4 w-4" /> Unmatch</button>
                    </div>
                  )}
                </div>
              )}

              {/* ============ REVEAL PROGRESS CARD ============ */}
              {peerId && !reveal.loading && (
                <RevealProgressCard
                  messagesExchanged={reveal.meaningful}
                  messagesRequired={10}
                  voiceNoteSent={reveal.voiceMe > 0}
                  voiceNoteRequired
                  remainingInteractions={Math.max(0, 10 - reveal.meaningful)}
                  veilLifted={reveal.veilLifted}
                />
              )}

              {typingPeer && (
                <p className="px-5 -mt-1 mb-1 text-[11px] italic text-[oklch(0.78_0.12_328)]">{peerName} is typing…</p>
              )}


              {/* Veil Lifted celebration overlay */}
              {veilJustLifted && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
                  onClick={() => setVeilJustLifted(false)}
                >
                  <div className="mx-4 max-w-sm rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-glow">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero">
                      <Sparkles className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h2 className="font-display text-2xl">Veil Lifted</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You took the time to get to know each other first.
                      The veil has now been removed.
                    </p>
                    <button
                      onClick={() => setVeilJustLifted(false)}
                      className="mt-5 rounded-full bg-gradient-hero px-6 py-2 text-sm font-medium text-primary-foreground shadow-glow"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}



              {/* ============ MESSAGES ============ */}
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {msgs.length === 0 && (
                  <div className="mx-auto max-w-md py-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-accent/15 backdrop-blur-xl">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-light tracking-tight">Start your first conversation</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Meaningful connections begin with curiosity.
                    </p>
                    <div className="mt-5 space-y-2 text-left">
                      <p className="text-center font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                        Suggested icebreakers
                      </p>
                      {SUGGESTED_OPENERS.map((line) => (
                        <button
                          key={line}
                          type="button"
                          onClick={() => setDraft(line)}
                          className="block w-full rounded-2xl border border-border/60 bg-surface/40 px-4 py-3 text-left text-sm text-foreground/90 backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-surface/60"
                        >
                          {line}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {msgs.map((m, idx) => {
                    const mine = m.sender_id === user.id;
                    const mReactions = reactions.filter((r) => r.message_id === m.id);
                    const seenByPeer = peerId ? (reads[m.id] ?? []).includes(peerId) : false;
                    const prev = msgs[idx - 1];
                    const grouped = prev && prev.sender_id === m.sender_id && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000);
                    const ts = new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                    return (
                      <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "mt-0.5" : "mt-2.5"}`}>
                        <div className="relative flex items-end gap-1.5">
                          {m.message_type === "voice" && m.media_url ? (
                            <div className="max-w-[78%]">
                              <VoiceMessageBubble
                                mediaPath={m.media_url}
                                duration={m.duration_seconds ?? null}
                                mine={mine}
                              />
                            </div>
                          ) : m.message_type === "gift" || m.content.startsWith("[[gift:") ? (
                            <GiftMessageBubble
                              content={m.content}
                              mine={mine}
                              senderName={mine ? "You" : peerName}
                            />
                          ) : (
                            <div
                              title={ts}
                              className={`max-w-[78%] px-4 py-2.5 text-[15px] leading-relaxed transition-transform animate-fade-in ${
                                mine
                                  ? "rounded-[22px] rounded-br-md bg-gradient-to-br from-[oklch(0.56_0.22_286)] via-[oklch(0.61_0.22_304)] to-[oklch(0.65_0.20_328)] text-white shadow-[0_6px_24px_-8px_oklch(0.61_0.22_304/0.55)]"
                                  : "rounded-[22px] rounded-bl-md border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.15_0.05_298/0.7)] text-foreground backdrop-blur-xl shadow-[0_4px_18px_-8px_oklch(0_0_0/0.45)]"
                              }`}
                            >
                              {m.content}
                            </div>

                          )}

                          <button
                            onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="React"
                          >
                            <Smile className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {pickerFor === m.id && (
                            <div className="absolute -top-10 right-0 z-30 flex gap-1 rounded-full border border-border bg-card p-1 shadow-glow">
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
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <span>{ts}</span>
                            <span>·</span>
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
                      <span className="inline-flex gap-1 rounded-2xl border border-border/50 bg-surface/70 px-3.5 py-2.5 backdrop-blur-xl">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Icebreakers moved to bottom sheet → Icebreakers tab */}


              {showContactWarning && (
                <div className="mx-3 mb-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
                  Contact sharing unlocks after Day 7 + both verified (or Premium).
                </div>
              )}

              {/* ============ QUICK ACTION BAR ============ */}
              <QuickActionBar
                disabled={!peerId}
                voiceBadge={false}
                giftBadge={false}
                aiBadge={overallScore != null && overallScore >= 80}
                dateBadge={reveal.veilLifted}
                onVoice={() => {
                  if (mustVerify) { setVerifyOpen(true); return; }
                  // Hidden mic in QuickActionBar focuses the underlying VoiceMessageRecorder mic
                  document.getElementById("unveil-voice-mic")?.click();
                }}
                onGift={() => setGiftOpen(true)}
                onAi={() => { setPanelTab("ai"); setPanelOpen(true); }}
                onDate={() => { setPanelTab("icebreakers"); setPanelOpen(true); if (ideas.length === 0) fetchIcebreakers(ideaCategory); }}
              />

              {/* ============ LUXURY COMPOSER ============ */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="relative z-20 shrink-0 px-3 pb-3 pt-1 sm:px-4"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex min-w-0 items-center gap-2 rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.75)] p-1.5 backdrop-blur-2xl shadow-[0_10px_30px_-15px_oklch(0_0_0/0.55)]">
                  <button
                    type="button"
                    onClick={() => { setPanelTab("icebreakers"); setPanelOpen(true); if (ideas.length === 0) fetchIcebreakers(ideaCategory); }}
                    disabled={!peerId}
                    aria-label="Icebreakers"
                    className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.18_0.07_298)] to-[oklch(0.22_0.09_298)] text-foreground/80 transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  {/* Voice recorder kept in DOM (hidden behind action bar mic button id) */}
                  <span id="unveil-voice-mic" className="hidden">
                    {!mustVerify && (
                      <VoiceMessageRecorder
                        conversationId={active.id}
                        senderId={user.id}
                        maxSeconds={quota.dailyLimit >= 35 ? 120 : 60}
                        onSent={() => {
                          refreshQuota();
                          if (!verified) {
                            setSentCount((n) => {
                              const next = n + 1;
                              if (next >= VERIFY_THRESHOLD) setVerifyOpen(true);
                              return next;
                            });
                          }
                        }}
                        onQuotaExhausted={() => setPaywallOpen(true)}
                        disabled={!quota.unlimited && quota.remaining <= 0}
                      />
                    )}
                  </span>

                  {mustVerify && (
                    <button
                      type="button"
                      onClick={() => setVerifyOpen(true)}
                      aria-label="Verify to continue"
                      className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-[oklch(0.18_0.07_298)] text-foreground/60"
                    >
                      <LockIcon className="h-4 w-4" />
                    </button>
                  )}

                  <input
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    placeholder="Type a message…"
                    aria-label={`Message ${peerName}`}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] text-foreground outline-none placeholder:text-foreground/40"
                  />

                  <button
                    type="button"
                    onClick={() => setPickerFor((v) => (v === "composer" ? null : "composer"))}
                    aria-label="Emoji"
                    className="shrink-0 grid h-9 w-9 place-items-center rounded-full text-foreground/60 transition-colors hover:text-foreground"
                  >
                    <Smile className="h-4 w-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Send"
                    className="shrink-0 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.56_0.22_286)] via-[oklch(0.61_0.22_304)] to-[oklch(0.65_0.20_328)] text-white shadow-[0_6px_20px_-6px_oklch(0.61_0.22_304/0.7)] transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {pickerFor === "composer" && (
                  <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.85)] p-2 backdrop-blur-xl">
                    {QUICK_EMOJI.map((e) => (
                      <button key={e} type="button"
                        onClick={() => { setDraft((d) => d + e); setPickerFor(null); }}
                        className="rounded-full px-2 py-1 text-lg hover:bg-[oklch(0.18_0.07_298/0.8)]">{e}</button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-center text-[10px] text-foreground/40">
                  Phone numbers, emails and socials stay hidden until you both choose to share.
                </p>
              </form>


              {/* ============ UNIFIED INSIGHTS / DISCOVERY / ICEBREAKERS / EXCHANGE SHEET ============ */}
              <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
                <SheetContent
                  side={isMobile ? "bottom" : "right"}
                  className={
                    isMobile
                      ? "h-[85vh] rounded-t-3xl border-border/60 bg-card/95 p-0 backdrop-blur-2xl"
                      : "w-full sm:max-w-md border-border/60 bg-card/95 p-0 backdrop-blur-2xl"
                  }
                >
                  <SheetHeader className="border-b border-border/40 px-5 py-4">
                    <SheetTitle className="font-display text-xl font-light tracking-tight">
                      {peerName} · Details
                    </SheetTitle>
                  </SheetHeader>
                  <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as typeof panelTab)} className="flex h-[calc(100%-65px)] flex-col">
                    <TabsList className="mx-5 mt-3 grid grid-cols-5 bg-surface/60">
                      <TabsTrigger value="insights" className="text-[11px]">Insights</TabsTrigger>
                      <TabsTrigger value="ai" className="text-[11px]">✨ AI</TabsTrigger>
                      <TabsTrigger value="discovery" className="text-[11px]">Discovery</TabsTrigger>
                      <TabsTrigger value="icebreakers" className="text-[11px]">Ice</TabsTrigger>
                      <TabsTrigger value="reveal" className="text-[11px]">Exchange</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <TabsContent value="ai" className="mt-0 space-y-3">
                        {peerId ? (
                          <>
                            <AiCompatibilityPanel peerId={peerId} />
                            <Link
                              to="/insights-ai"
                              className="block rounded-2xl border border-border/60 bg-surface/40 p-4 text-center text-sm font-semibold text-primary hover:border-primary/40"
                            >
                              View AI Compatibility Insights →
                            </Link>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Select a conversation to view AI Compatibility Insights.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="insights" className="mt-0 space-y-3">
                        {/* Compatibility card */}
                        <button
                          type="button"
                          onClick={() => setPanelTab("discovery")}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4 text-left transition-all hover:border-primary/40"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold">Compatibility</span>
                              <span className="font-mono text-xs text-primary">{overallScore ?? 0}%</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{band?.label ?? "—"}</p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
                              <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${Math.max(4, overallScore ?? 0)}%` }} />
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Connection Progress card */}
                        <button
                          type="button"
                          onClick={() => setPanelTab("reveal")}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4 text-left transition-all hover:border-primary/40"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                            <Calendar className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold">Connection Progress</span>
                              <span className="font-mono text-xs text-muted-foreground">Day {dayN ?? 1} of 7</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {contactShareUnlocked ? "Contact exchange unlocked" : "Building rapport — keep the conversation going"}
                            </p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
                              <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${((dayN ?? 1) / 7) * 100}%` }} />
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Icebreakers card */}
                        <button
                          type="button"
                          onClick={() => { setPanelTab("icebreakers"); if (ideas.length === 0) fetchIcebreakers(ideaCategory); }}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4 text-left transition-all hover:border-primary/40"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                            <MessageSquare className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold">Icebreakers</span>
                              <span className="font-mono text-xs text-muted-foreground">{ideas.length || 3}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">AI-generated questions</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Contact Exchange card */}
                        <button
                          type="button"
                          onClick={() => setPanelTab("reveal")}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4 text-left transition-all hover:border-primary/40"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                            {contactShareUnlocked ? <Phone className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold">Contact Exchange</span>
                              <span className={`font-mono text-xs ${contactShareUnlocked ? "text-emerald-400" : "text-muted-foreground"}`}>
                                {contactShareUnlocked ? "Unlocked" : "Locked"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {contactShareUnlocked ? "You can exchange phone, email, or social handles" : "Unlocks after the 7-day journey"}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Shared Interests card */}
                        {insights.length > 0 && (
                          <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                                <HeartIcon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13px] font-semibold">Shared Interests</span>
                                  <span className="font-mono text-xs text-muted-foreground">{insights.length}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">Things you have in common</p>
                              </div>
                            </div>
                            <ul className="mt-3 grid gap-1.5">
                              {insights.map((line) => (
                                <li key={line} className="flex items-start gap-2 text-[12px] text-foreground/85">
                                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                    <Check className="h-2.5 w-2.5" />
                                  </span>
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Compatibility metrics breakdown */}
                        <div className="grid grid-cols-2 gap-2">
                          {metrics.map((m) => (
                            <div key={m.label} className="rounded-2xl border border-border/60 bg-surface/40 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">{m.label}</span>
                                <span className="font-mono text-sm font-semibold">{m.value}%</span>
                              </div>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
                                <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${Math.max(4, m.value)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="discovery" className="mt-0">
                        {matchInfo && peerId ? (
                          <ConversationScaffold
                            matchId={matchInfo.id}
                            matchCreatedAt={matchInfo.created_at}
                            selfId={user.id}
                            peerId={peerId}
                            peerName={peerName}
                            onChatGateChange={() => { /* DB trigger is source of truth */ }}
                          />
                        ) : (
                          <p className="text-center text-sm text-muted-foreground">Discovery unlocks once you match.</p>
                        )}
                      </TabsContent>

                      <TabsContent value="icebreakers" className="mt-0 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => fetchIcebreakers(undefined)}
                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${!ideaCategory ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>Mix</button>
                          {ICE_CATEGORIES.map((c) => (
                            <button key={c.id} onClick={() => fetchIcebreakers(c.id)}
                              className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${ideaCategory === c.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                              {c.label}
                            </button>
                          ))}
                          <button onClick={() => fetchIcebreakers(ideaCategory)} disabled={ideasLoading}
                            className="ml-auto rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:border-primary disabled:opacity-50">
                            <RefreshCw className={`mr-1 inline h-3 w-3 ${ideasLoading ? "animate-spin" : ""}`} /> Generate
                          </button>
                        </div>
                        {opener && !ideasLoading && (
                          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-mono text-[9px] uppercase tracking-luxury text-accent">Suggested opener</span>
                              <button onClick={() => { setDraft(opener); setPanelOpen(false); }}
                                className="rounded-full bg-gradient-hero px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">Use</button>
                            </div>
                            <p className="text-xs leading-relaxed">{opener}</p>
                          </div>
                        )}
                        {ideasLoading && ideas.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">Reading your compatibility…</div>
                        ) : ideas.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">Tap Generate to get personalized icebreakers.</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {ideas.map((i, idx) => (
                              <button key={idx} type="button"
                                onClick={() => { setDraft(i.text); setPanelOpen(false); }}
                                className="rounded-2xl border border-border bg-card px-3 py-2.5 text-left text-xs hover:border-primary">
                                <span className="mr-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase text-primary">{i.kind}</span>
                                {i.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="reveal" className="mt-0 space-y-3">
                        {peerId ? (
                          <>
                            <DateReadinessPanel peerUserId={peerId} peerName={peerName} state={reveal} />
                            <ContactRevealPanel peerUserId={peerId} peerName={peerName} />
                          </>
                        ) : null}
                      </TabsContent>
                    </div>
                  </Tabs>
                </SheetContent>
              </Sheet>

              {/* Floating Insights handle removed — Insights now live in QuickActionBar */}

            </>
          )}
        </section>

      </div>
    </div>
  );
}
