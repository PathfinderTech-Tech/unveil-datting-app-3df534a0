import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadCompatibility, likeProfile, bandLabel } from "@/lib/matching-api";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ArrowLeft, ShieldCheck, Send, Sparkles, AlertTriangle, Heart, MoreVertical, Flag, Ban, X, Lock, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ContactExchangeCountdown } from "@/components/ContactExchangeCountdown";
import { ContactRevealPanel } from "@/components/ContactRevealPanel";
import { useMessageQuota } from "@/hooks/use-message-quota";
import { MessagePaywallModal } from "@/components/MessagePaywallModal";
import { getPrimaryProfileMedia } from "@/lib/profile-media.functions";
import { ReportUserDialog, blockUser } from "@/components/ReportUserDialog";
import { generateIcebreakers, type Icebreaker } from "@/lib/icebreakers.functions";
import { AiCompatibilityPanel } from "@/components/AiCompatibilityPanel";
import { useMatchReveal } from "@/lib/reveal";


export const Route = createFileRoute("/match/$userId")({
  head: () => ({ meta: [{ title: "Match — UNVEIL" }] }),
  component: MatchExperience,
});

type Compat = Awaited<ReturnType<typeof loadCompatibility>>;
type Profile = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  relationship_intent: string | null;
  bio: string | null;
  verified: boolean | null;
  interests: string[] | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  discovery_mode?: "avatar" | "photo" | null;
};
type Msg = { id: string; sender_id: string; content: string; created_at: string };

function ScoreRing({ value, size = 96 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border) / 0.4)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ringGrad)" strokeWidth={6} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-2xl font-bold leading-none">{value}%</div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Match</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-foreground/85">{label}</span>
        <span className="font-mono text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function MatchExperience() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const reveal = useMatchReveal(userId);


  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [compat, setCompat] = useState<Compat>(null);
  const [loading, setLoading] = useState(true);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchCreatedAt, setMatchCreatedAt] = useState<string | null>(null);
  const [mutual, setMutual] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"compat" | "ai" | "discovery" | "icebreakers" | "reveal">("compat");
  const [icebreakers, setIcebreakers] = useState<Icebreaker[] | null>(null);
  const [icebreakersLoading, setIcebreakersLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function openSheet(tab: typeof sheetTab) { setSheetTab(tab); setDiscoveryOpen(true); }

  async function loadIcebreakers(force = false) {
    if (icebreakersLoading) return;
    if (icebreakers && !force) return;
    setIcebreakersLoading(true);
    try {
      const res = await generateIcebreakers({ data: { peerId: userId } });
      if ("error" in res) { toast.error(res.error); }
      else { setIcebreakers(res.icebreakers); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load icebreakers");
    } finally {
      setIcebreakersLoading(false);
    }
  }

  useEffect(() => {
    if (discoveryOpen && sheetTab === "icebreakers" && !icebreakers) void loadIcebreakers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveryOpen, sheetTab]);


  const { quota, refresh: refreshQuota } = useMessageQuota();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setMeId(uid);
      if (uid && uid === userId) { navigate({ to: "/profile", replace: true }); return; }

      const [{ data: p }, mediaRows] = await Promise.all([
        (supabase as any)
          .rpc("get_public_match_profiles", { _targets: [userId] })
          .then((res: any) => ({ data: Array.isArray(res?.data) ? res.data[0] : null })),
        getPrimaryProfileMedia({ data: { userIds: [userId] } }),
      ]);
      const prow = p as (Profile & { profile_photo_url?: string | null }) | null;
      const media = mediaRows[0];
      if (prow) {
        prow.first_name = media?.firstName ?? prow.first_name?.trim() ?? null;
        prow.photo_url = media?.photoUrl ?? prow.profile_photo_url ?? prow.photo_url ?? null;
        prow.avatar_url = media?.avatarUrl ?? prow.avatar_url ?? null;
        prow.discovery_mode = media?.hasUploadedPhoto ? "photo" : prow.discovery_mode;
      }
      setProfile(prow);
      setCompat(await loadCompatibility(userId));

      if (uid) {
        const { data: m } = await supabase
          .from("matches")
          .select("id, mutual_interest, created_at")
          .or(`and(user_id.eq.${uid},matched_user_id.eq.${userId}),and(user_id.eq.${userId},matched_user_id.eq.${uid})`)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const row = m as { id: string; mutual_interest: boolean; created_at: string } | null;
        if (row) {
          setMatchId(row.id);
          setMatchCreatedAt(row.created_at);
          setMutual(!!row.mutual_interest);
          if (row.mutual_interest) {
            const a = uid < userId ? uid : userId;
            const b = uid < userId ? userId : uid;
            const { data: c } = await supabase
              .from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
            setConversationId((c as { id: string } | null)?.id ?? null);
          }
        }
      }
      setLoading(false);
    })();
  }, [userId, navigate]);

  // Load + subscribe to messages
  useEffect(() => {
    if (!conversationId || !meId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("messages").select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId).order("created_at");
      if (!alive) return;
      setMsgs((data ?? []) as Msg[]);
    })();
    const ch = supabase
      .channel(`match-chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (p) => setMsgs((cur) => cur.some((m) => m.id === (p.new as Msg).id) ? cur : [...cur, p.new as Msg]))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [conversationId, meId]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs.length]);

  // Day from match age
  const day = useMemo(() => {
    if (!matchCreatedAt) return 1;
    const ms = Date.now() - new Date(matchCreatedAt).getTime();
    return Math.max(1, Math.min(7, Math.floor(ms / (24 * 3600_000)) + 1));
  }, [matchCreatedAt]);

  async function send() {
    if (!conversationId || !meId || !draft.trim() || sending) return;
    if (!quota.unlimited && quota.remaining <= 0) { setPaywallOpen(true); return; }
    const content = draft.trim();
    setDraft("");
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId, sender_id: meId, content,
    });
    setSending(false);
    if (error) {
      if (error.message?.includes("DAILY_MESSAGE_LIMIT_REACHED")) { setPaywallOpen(true); await refreshQuota(); return; }
      if (error.message?.includes("CONTACT_SHARING_LOCKED")) {
        setDraft(content);
        toast.error("Contact sharing unlocks after trust milestones.");
        return;
      }
      setDraft(content);
      toast.error(error.message);
      return;
    }
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    refreshQuota();
  }

  async function handleLike() {
    const res = await likeProfile(userId);
    if (res.error) { toast.error(res.error); return; }
    if (res.mutual) { toast.success("It's mutual!"); window.location.reload(); }
    else { toast.success("Interest sent."); navigate({ to: "/matches" }); }
  }

  if (loading || !profile) {
    return <div className="min-h-[100dvh] bg-background"><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  const band = compat ? bandLabel(compat.overall) : null;
  const score = compat?.overall ?? 0;

  return (
    <div className="min-h-[100dvh] bg-background">
      <MessagePaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        dailyLimit={quota.dailyLimit}
        isPremium={quota.dailyLimit >= 35}
        returnTo={`/match/${userId}`}
      />

      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col px-2 sm:px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {/* COMPACT STICKY HEADER */}
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-1 py-2 backdrop-blur sm:gap-3">
          <Link to="/matches" aria-label="Back" className="rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="shrink-0">
            <ProfileAvatar
              userId={profile.id}
              name={profile.first_name}
              discoveryMode={profile.discovery_mode ?? "photo"}
              avatarUrl={profile.avatar_url ?? null}
              photoUrl={profile.photo_url ?? null}
              size={36}
              veiled={!reveal.veilLifted}
            />
          </div>
          <button
            onClick={() => openSheet("compat")}
            className="min-w-0 flex-1 text-left"
            aria-label="Open compatibility & insights"
          >
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-base font-bold">
                {profile.first_name}{profile.age ? `, ${profile.age}` : ""}
              </span>
              {profile.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Verified" />}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-primary">
              <Heart className="h-3 w-3 fill-current" />
              <span className="font-medium">{score}% Compatible</span>
            </div>
          </button>
          <button
            onClick={() => openSheet("icebreakers")}
            aria-label="Icebreakers"
            className="shrink-0 rounded-full border border-primary/30 p-1.5 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          {meId && meId !== userId && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"
                  >
                    <Flag className="h-4 w-4" /> Report
                  </button>
                  <button
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      if (!confirm("Block this person? They won't be able to contact you again.")) return;
                      try {
                        await blockUser(userId);
                        toast.success("Blocked.");
                        navigate({ to: "/matches" });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Couldn't block");
                      }
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"
                  >
                    <Ban className="h-4 w-4" /> Block
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportedUserId={userId}
          onBlockToo={async () => {
            try { await blockUser(userId); } catch { /* ignore */ }
          }}
        />

        {/* CONVERSATION — dominant surface */}
        {mutual && conversationId ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-2 py-4 sm:px-3">
              {msgs.length > 0 && (
                <div className="flex justify-center">
                  <span className="text-[11px] font-medium text-muted-foreground">Today</span>
                </div>
              )}
              {msgs.length === 0 && (
                <div className="m-auto max-w-xs pt-8 text-center text-sm text-muted-foreground">
                  Say hi to {profile.first_name}. Lead with something that matters to you.
                </div>
              )}
              {msgs.map((m) => {
                const mine = m.sender_id === meId;
                const time = new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                if (mine) {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[78%] rounded-3xl rounded-br-md bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-sm text-primary-foreground shadow-lg shadow-primary/20">
                        <div className="whitespace-pre-wrap">{m.content}</div>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/80">
                          <span>{time}</span>
                          <span aria-hidden>✓✓</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex items-end justify-start gap-2">
                    <div className="shrink-0">
                      <ProfileAvatar
                        userId={profile.id}
                        name={profile.first_name}
                        discoveryMode={profile.discovery_mode ?? "photo"}
                        avatarUrl={profile.avatar_url ?? null}
                        photoUrl={profile.photo_url ?? null}
                        size={28}
                      />
                    </div>
                    <div className="max-w-[75%] rounded-3xl rounded-bl-md bg-surface/80 px-4 py-2.5 text-sm text-foreground shadow-sm">
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer pinned at bottom */}
            <div
              className="shrink-0 bg-background/95 px-3 pt-2 backdrop-blur"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            >
              {!quota.loading && !quota.unlimited && (
                <div className="mb-1.5 px-1 text-center text-[10px] text-muted-foreground">
                  {quota.remaining} of {quota.dailyLimit} interactions remaining ·{" "}
                  <Link to="/premium" search={{ returnTo: `/match/${userId}` } as never} className="text-accent underline">Daily Pass</Link>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => openSheet("compat")}
                  aria-label="Open features"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
                >
                  <span className="text-xl leading-none">+</span>
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${profile.first_name}…`}
                  rows={1}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-full border border-border bg-surface/70 px-4 py-2.5 text-sm placeholder:text-muted-foreground outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>
        ) : (
          /* Not mutual yet — show interest CTA */
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="rounded-3xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Send interest to unlock the conversation.</p>
              <button onClick={handleLike}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
                <Heart className="h-4 w-4" /> Open If Mutual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM SHEET — tabbed extra features (matches prototype) */}
      {discoveryOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button
            aria-label="Close insights"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDiscoveryOpen(false)}
          />
          <div className="relative max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl">
            {/* Grab handle */}
            <div className="flex justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Tab strip */}
            <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 pt-3">
              {([
                { id: "compat", label: "Insights" },
                { id: "ai", label: "✨ AI Compatibility Insights" },
                { id: "discovery", label: `Day ${day} Discovery` },
                { id: "icebreakers", label: "Icebreakers" },
                { id: "reveal", label: "Contact Exchange" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSheetTab(t.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    sheetTab === t.id
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow"
                      : "bg-surface/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setDiscoveryOpen(false)}
                aria-label="Close"
                className="ml-auto shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-2"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              {/* ── COMPATIBILITY TAB ── */}
              {sheetTab === "compat" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5">
                    <ScoreRing value={score} size={120} />
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">Overall Compatibility</div>
                      {band && (
                        <div className={`mt-0.5 font-mono text-[10px] uppercase tracking-widest ${band.tone}`}>{band.label}</div>
                      )}
                    </div>
                  </div>
                  {compat && (
                    <div className="space-y-3 rounded-2xl border border-border bg-surface/40 p-4">
                      <ScoreBar label="Values" value={compat.values_score} />
                      <ScoreBar label="Communication" value={compat.communication} />
                      <ScoreBar label="Lifestyle" value={compat.lifestyle} />
                      <ScoreBar label="Future Goals" value={compat.goals} />
                    </div>
                  )}
                  {compat?.strengths?.length ? (
                    <div className="rounded-2xl border border-border bg-surface/50 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Strengths</div>
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {compat.strengths.slice(0, 3).map((s) => (
                          <li key={s} className="flex items-start gap-1.5"><Sparkles className="mt-0.5 h-3 w-3 text-accent" />{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {compat?.friction?.length ? (
                    <div className="rounded-2xl border border-border bg-surface/50 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Friction to watch</div>
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {compat.friction.slice(0, 2).map((s) => (
                          <li key={s} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3 w-3 text-yellow-500" />{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {profile.bio && (
                    <p className="rounded-2xl border border-border bg-surface/50 p-3 text-sm italic text-foreground/85">"{profile.bio}"</p>
                  )}
                </div>
              )}

              {/* ── AI INSIGHTS TAB ── */}
              {sheetTab === "ai" && (
                <div className="space-y-4">
                  <AiCompatibilityPanel peerId={userId} />
                </div>
              )}

              {/* ── DAY DISCOVERY TAB ── */}
              {sheetTab === "discovery" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Day {day} of 7</div>
                    <ScoreRing value={Math.round((day / 7) * 100)} size={110} />
                    <p className="max-w-xs text-sm text-foreground/85">
                      You're in the discovery phase. Continue chatting to unlock more about each other.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/40 p-3">
                    <ContactExchangeCountdown day={day} />
                  </div>
                </div>
              )}

              {/* ── ICEBREAKERS TAB ── */}
              {sheetTab === "icebreakers" && (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Break the ice with meaningful questions.</p>
                  </div>
                  {icebreakersLoading && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Generating prompts…</div>
                  )}
                  {!icebreakersLoading && icebreakers && icebreakers.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">No prompts yet.</div>
                  )}
                  {!icebreakersLoading && icebreakers?.map((ib, i) => (
                    <button
                      key={i}
                      onClick={() => { setDraft(ib.text); setDiscoveryOpen(false); }}
                      className="block w-full rounded-2xl border border-border bg-surface/60 p-4 text-left text-sm text-foreground hover:border-primary/40 hover:bg-surface"
                    >
                      {ib.text}
                    </button>
                  ))}
                  <button
                    onClick={() => loadIcebreakers(true)}
                    disabled={icebreakersLoading}
                    className="mx-auto mt-2 flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs text-foreground hover:bg-surface disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${icebreakersLoading ? "animate-spin" : ""}`} />
                    Suggest Another
                  </button>
                </div>
              )}

              {/* ── CONTACT EXCHANGE TAB ── */}
              {sheetTab === "reveal" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/40 p-6 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-full border border-primary/30 bg-primary/10">
                      <Lock className="h-7 w-7 text-primary" />
                    </div>
                    <p className="max-w-xs text-sm text-foreground/85">
                      Exchange phone, email, or social handles to continue the conversation outside UNVEIL.
                    </p>
                  </div>
                  <ul className="space-y-2 rounded-2xl border border-border bg-surface/40 p-4 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${day >= 7 ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                      <span className={day >= 7 ? "text-foreground" : "text-muted-foreground"}>Complete the 7-day journey</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${score >= 70 ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                      <span className={score >= 70 ? "text-foreground" : "text-muted-foreground"}>High Compatibility</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${mutual ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                      <span className={mutual ? "text-foreground" : "text-muted-foreground"}>Both Agree to Exchange</span>
                    </li>
                  </ul>
                  {mutual ? (
                    <ContactRevealPanel peerUserId={userId} peerName={profile.first_name} />
                  ) : (
                    <button disabled className="w-full rounded-full bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
                      Exchange Contact
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
