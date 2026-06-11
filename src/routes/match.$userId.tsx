import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { loadCompatibility, likeProfile, bandLabel } from "@/lib/matching-api";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ArrowLeft, MapPin, ShieldCheck, Send, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Heart, MessageCircle, MoreVertical, Flag, Ban } from "lucide-react";
import { toast } from "sonner";
import { SlowRevealTimeline } from "@/components/SlowRevealTimeline";
import { ContactRevealPanel } from "@/components/ContactRevealPanel";
import { useMessageQuota } from "@/hooks/use-message-quota";
import { MessagePaywallModal } from "@/components/MessagePaywallModal";
import { getPrimaryProfileMedia } from "@/lib/profile-media.functions";
import { ReportUserDialog, blockUser } from "@/components/ReportUserDialog";

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
  travel_status?: string | null;
  travel_expires_at?: string | null;
  travel_warning_count?: number | null;
  account_restricted?: boolean | null;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
        supabase
          .from("profiles")
          .select("id, first_name, age, city, country, relationship_intent, bio, verified, interests, avatar_url, photo_url, profile_photo_url, discovery_mode, travel_status, travel_expires_at, travel_warning_count, account_restricted")
          .eq("id", userId).maybeSingle(),
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
    return <div className="min-h-screen"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  const band = compat ? bandLabel(compat.overall) : null;
  const score = compat?.overall ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <UnveilNav />
      <MessagePaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        dailyLimit={quota.dailyLimit}
        isPremium={quota.dailyLimit >= 35}
        returnTo={`/match/${userId}`}
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          <Link to="/matches" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          {meId && meId !== userId && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className="rounded-full border border-border bg-surface/60 p-1.5 hover:bg-surface"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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
        </div>
        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportedUserId={userId}
          onBlockToo={async () => {
            try { await blockUser(userId); } catch { /* ignore */ }
          }}
        />

        {/* HERO — photo + identity + score */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-glow backdrop-blur sm:p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <ProfileAvatar
                userId={profile.id}
                name={profile.first_name}
                discoveryMode={profile.discovery_mode ?? "photo"}
                avatarUrl={profile.avatar_url ?? null}
                photoUrl={profile.photo_url ?? null}
                size={88}
                veiled={msgs.length === 0}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
                  {profile.first_name}{profile.age ? `, ${profile.age}` : ""}
                </h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                <LocationTrustBadge profile={profile} size="xs" />

              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{profile.city ?? profile.country ?? "—"}</span>
              </div>
              {band && (
                <div className={`mt-1.5 font-mono text-[10px] uppercase tracking-widest ${band.tone}`}>{band.label}</div>
              )}
            </div>
            <div className="shrink-0"><ScoreRing value={score} size={84} /></div>
          </div>

          {/* Compatibility dashboard */}
          {compat && (
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <ScoreBar label="Values" value={compat.values_score} />
              <ScoreBar label="Lifestyle" value={compat.lifestyle} />
              <ScoreBar label="Communication" value={compat.communication} />
              <ScoreBar label="Goals" value={compat.goals} />
            </div>
          )}

          <div className="mt-3">
            <SlowRevealTimeline day={day} />
          </div>
        </div>

        {/* Not mutual yet — show interest CTA */}
        {!mutual && (
          <div className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Send interest to unlock the conversation.</p>
            <button onClick={handleLike}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
              <Heart className="h-4 w-4" /> Open If Mutual
            </button>
          </div>
        )}

        {/* Discovery cards (collapsible) */}
        {mutual && (
          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur">
            <button
              onClick={() => setDiscoveryOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Discovery · journey day {day}
              </span>
              {discoveryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {discoveryOpen && (
              <div className="space-y-3 px-4 pb-4">
                {profile.bio && (
                  <p className="rounded-2xl border border-border bg-surface/50 p-3 text-sm italic text-foreground/85">"{profile.bio}"</p>
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
                <ContactRevealPanel peerUserId={userId} peerName={profile.first_name} />
              </div>
            )}
          </div>
        )}

        {/* CONVERSATION — dominant 60vh+ surface */}
        {mutual && conversationId && (
          <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-glow">
            <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-2.5">
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Conversation with {profile.first_name}</span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
              {msgs.length === 0 && (
                <div className="m-auto max-w-xs text-center text-sm text-muted-foreground">
                  Say hi to {profile.first_name}. Lead with something that matters to you.
                </div>
              )}
              {msgs.map((m) => {
                const mine = m.sender_id === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      mine
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                        : "border border-border bg-surface/70 text-foreground"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border bg-card/80 p-2.5 backdrop-blur">
              {!quota.loading && !quota.unlimited && (
                <div className="mb-1.5 px-1 text-[10px] text-muted-foreground">
                  {quota.remaining} of {quota.dailyLimit} interactions remaining ·{" "}
                  <Link to="/checkout" search={{ product: "message_pass", returnTo: `/match/${userId}` } as never} className="text-accent underline">Daily Pass $1.99</Link>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${profile.first_name}…`}
                  rows={1}
                  className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
