import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { loadCompatibility, likeProfile, bandLabel } from "@/lib/matching-api";
import { Avatar } from "@/components/Avatar";
import { Sparkles, AlertTriangle, MessageCircle, Heart, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ThoughtModal } from "@/components/ThoughtModal";

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
      setProfile(p as Profile | null);
      setCompat(await loadCompatibility(userId));
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
                <div className="font-display text-4xl font-bold text-gradient-hero">{compat.overall}%</div>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${band.tone}`}>{band.label}</div>
              </div>
            )}
          </div>

          {profile.bio && <p className="mt-4 text-sm italic text-foreground/85">"{profile.bio}"</p>}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Sub-scores</h2>
            <div className="mt-3 space-y-3">
              {subs.map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono">{r.v}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full bg-gradient-hero" style={{ width: `${r.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
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

        <div className="mt-6 flex justify-end">
          <button onClick={handleLike} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow">
            <Heart className="h-4 w-4" /> Send interest
          </button>
        </div>
      </div>
    </div>
  );
}
