import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { loadCompatibility, likeProfile, bandLabel } from "@/lib/matching-api";
import { Avatar } from "@/components/Avatar";
import { Sparkles, AlertTriangle, MessageCircle, Heart, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ThoughtModal } from "@/components/ThoughtModal";
import { SlowRevealTimeline } from "@/components/SlowRevealTimeline";
import { CompatibilityMap } from "@/components/CompatibilityMap";
import { CoupleJourney } from "@/components/CoupleJourney";
import { PhotoRevealPanel } from "@/components/PhotoRevealPanel";

export const Route = createFileRoute("/match/$userId")({
  head: () => ({ meta: [{ title: "Match insights — UNVEIL" }] }),
  component: MatchInsights,
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
};

function MatchInsights() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [compat, setCompat] = useState<Compat>(null);
  const [loading, setLoading] = useState(true);
  const [mineInterests, setMineInterests] = useState<string[]>([]);
  const [showThought, setShowThought] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (u.user?.id && u.user.id === userId) {
        navigate({ to: "/profile", replace: true });
        return;
      }
      const { data: p } = await supabase.from("profiles")
        .select("id, first_name, age, city, country, relationship_intent, bio, verified, interests")
        .eq("id", userId).maybeSingle();
      const { data: me } = await supabase.from("profiles")
        .select("interests").eq("id", u.user?.id ?? "").maybeSingle();
      setMineInterests((me?.interests as string[]) ?? []);
      setMeId(u.user?.id ?? null);
      setProfile(p as Profile | null);
      setCompat(await loadCompatibility(userId));
      if (u.user?.id) {
        const { data: m } = await supabase
          .from("matches")
          .select("id, mutual_interest")
          .or(`and(user_id.eq.${u.user.id},matched_user_id.eq.${userId}),and(user_id.eq.${userId},matched_user_id.eq.${u.user.id})`)
          .eq("mutual_interest", true)
          .maybeSingle();
        setMatchId((m as any)?.id ?? null);
      }
      setLoading(false);
    })();
  }, [userId, navigate]);

  async function handleLike() {
    const res = await likeProfile(userId);
    if (res.error) { toast.error(res.error); return; }
    if (res.mutual && res.conversationId) {
      toast.success("It's mutual!");
      navigate({ to: "/chat", search: { c: res.conversationId } as never });
    } else {
      toast.success("Interest sent.");
      navigate({ to: "/matches" });
    }
  }

  if (loading || !profile) {
    return <div className="min-h-screen"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  const band = compat ? bandLabel(compat.overall) : null;
  const sharedInterests = (profile.interests ?? []).filter((i) => mineInterests.includes(i));
  const subs: { label: string; v: number }[] = compat ? [
    { label: "Goals", v: compat.goals },
    { label: "Values", v: compat.values_score },
    { label: "Communication", v: compat.communication },
    { label: "Lifestyle", v: compat.lifestyle },
  ] : [];

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/matches" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to matches
        </Link>

        <div className="mb-4">
          <SlowRevealTimeline day={3} />
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div style={{ filter: "blur(6px)" }}>
                <Avatar seed={profile.id.slice(0, 6) + "-180"} size={72} label={profile.first_name ?? "?"} />
              </div>
              <div>
                <div className="font-display text-2xl font-bold">{profile.first_name}, {profile.age}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {profile.city ?? profile.country ?? "—"}
                  {profile.verified && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Verified</span>}
                </div>
              </div>
            </div>
            {compat && band && (
              <div className="text-right">
                <div className={`font-mono text-[10px] uppercase tracking-wider ${band.tone}`}>{band.label}</div>
              </div>
            )}
          </div>

          {profile.bio && <p className="mt-4 text-sm italic text-foreground/85">"{profile.bio}"</p>}
        </div>

        {compat && (
          <div className="mt-4">
            <CompatibilityMap
              rows={[
                { label: "Values alignment", value: compat.values_score },
                {
                  label: "Communication style",
                  value: compat.communication,
                  note: "Your communication styles are different — this can create depth with patience.",
                },
                { label: "Life goals", value: compat.goals },
                { label: "Lifestyle fit", value: compat.lifestyle },
                { label: "Ambition match", value: compat.overall },
              ]}
            />
          </div>
        )}

        {matchId && meId && (
          <div className="mt-4">
            <CoupleJourney matchId={matchId} userId={meId} />
          </div>
        )}



        <div className="mt-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Shared</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Shared interests</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {sharedInterests.length === 0 && <span className="text-xs text-muted-foreground">None overlap yet</span>}
                {sharedInterests.map((i) => (
                  <span key={i} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px]">{i}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Relationship intent</div>
              <div className="mt-1 text-sm">{profile.relationship_intent ?? "—"}</div>
            </div>
          </div>
        </div>



        {compat && (
          <>
            <div className="mt-4 rounded-3xl border border-border bg-card p-6">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Compatibility strengths</h2>
              {compat.strengths.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Standard alignment across most dimensions.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {compat.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm"><Sparkles className="mt-0.5 h-4 w-4 text-accent" /> {s}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-border bg-card p-6">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Potential friction</h2>
              {compat.friction.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No major friction points detected.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {compat.friction.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" /> {s}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-border bg-card p-6">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Communication tips</h2>
              <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 text-primary" /> Open with a thought that matters to you — depth beats small talk here.</li>
                {compat.communication < 70 && (
                  <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 text-primary" /> You communicate differently. Ask, don't assume — clarity will save you weeks.</li>
                )}
                {compat.values_score >= 80 && (
                  <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 text-primary" /> You share core values. Lead with what you both care about.</li>
                )}
              </ul>
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={() => setShowThought(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm hover:bg-surface">
            <MessageCircle className="h-4 w-4" /> Send a thought
          </button>
          <button onClick={handleLike} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow">
            <Heart className="h-4 w-4" /> Send interest
          </button>
        </div>
      </div>
      {showThought && (
        <ThoughtModal
          targetUserId={userId}
          targetName={profile.first_name ?? undefined}
          onClose={() => setShowThought(false)}
          onSent={(r) => {
            if (r.mutual && r.conversationId) {
              navigate({ to: "/chat", search: { c: r.conversationId } as never });
            } else {
              navigate({ to: "/matches" });
            }
          }}
        />
      )}
    </div>
  );
}
