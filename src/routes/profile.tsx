import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar as GradientAvatar } from "@/components/Avatar";
import { SignedImage } from "@/components/SignedImage";
import { RevealProgressCard } from "@/components/RevealProgressCard";
import { Play, Pause, Pencil, Mic, Award, Settings as SettingsIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile · UNVEIL" },
      { name: "description", content: "Your UNVEIL dating profile — who you are." },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  archetype: string | null;
  photo_url: string | null;
  profile_photo_url: string | null;
  avatar_url: string | null;
  avatar_style: string | null;
  verified: boolean | null;
  relationship_intent: string | null;
  intention: string | null;
  interests: string[] | null;
  personality_axes: Record<string, number> | null;
  emotional_rhythm: Record<string, number> | null;
  preferred_language: string | null;
  readiness_score: number | null;
  readiness_breakdown: Record<string, number> | null;
  subscription_tier: string | null;
  onboarding_complete: boolean | null;
};

type VoiceRow = {
  id: string;
  prompt: string;
  audio_url: string;
  duration_seconds: number | null;
  signedUrl?: string;
};

function completionPercent(p: ProfileRow | null, voiceCount: number) {
  if (!p) return 0;
  const checks = [
    !!p.first_name,
    !!p.age,
    !!p.city,
    !!(p.bio && p.bio.length > 20),
    !!(p.interests && p.interests.length >= 3),
    !!(p.photo_url || p.profile_photo_url),
    !!p.avatar_url,
    !!(p.relationship_intent || p.intention),
    !!(p.personality_axes && Object.keys(p.personality_axes).length > 0),
    voiceCount > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function missingSections(p: ProfileRow | null, voiceCount: number): string[] {
  if (!p) return [];
  const missing: string[] = [];
  if (!p.bio || p.bio.length <= 20) missing.push("Bio");
  if (!p.interests || p.interests.length < 3) missing.push("Interests");
  if (!(p.photo_url || p.profile_photo_url)) missing.push("Profile photo");
  if (!p.avatar_url) missing.push("Avatar");
  if (!(p.relationship_intent || p.intention)) missing.push("Relationship intent");
  if (voiceCount === 0) missing.push("Voice prompt");
  return missing;
}

function ProfilePage() {
  const { checking } = useRequireOnboarding();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (alive) setProfile(p as ProfileRow | null);
      const { data: v } = await supabase
        .from("voice_prompts")
        .select("id, prompt, audio_url, duration_seconds")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!alive || !v) return;
      const signed = await Promise.all(
        v.map(async (row) => {
          const { data } = await supabase.storage.from("voice-prompts").createSignedUrl(row.audio_url, 60 * 60);
          return { ...row, signedUrl: data?.signedUrl ?? "" } as VoiceRow;
        }),
      );
      if (alive) setVoices(signed);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Public-facing identity is always the avatar; the real selfie stays gated
  // by the reveal system and is only shown in the "Photos & avatar" section.
  const displayPhoto = profile?.avatar_url || profile?.photo_url || null;
  const completion = completionPercent(profile, voices.length);
  const missing = missingSections(profile, voices.length);
  const axes = (profile?.personality_axes ?? {}) as Record<string, number>;
  const rhythm = (profile?.emotional_rhythm ?? {}) as Record<string, number>;
  const breakdown = (profile?.readiness_breakdown ?? {}) as Record<string, number>;
  const intent = profile?.relationship_intent || profile?.intention || null;

  function togglePlay(v: VoiceRow) {
    if (audioEl && playingId === v.id) {
      audioEl.pause();
      setPlayingId(null);
      return;
    }
    if (audioEl) audioEl.pause();
    const el = new Audio(v.signedUrl);
    el.onended = () => setPlayingId(null);
    el.play();
    setAudioEl(el);
    setPlayingId(v.id);
  }

  return (
    <div className="min-h-screen pb-24">
      <UnveilNav />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-glow">
          <div className="flex flex-wrap items-center gap-5">
            {displayPhoto ? (
              <SignedImage
                src={displayPhoto}
                alt={profile?.first_name ?? "You"}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/40"
                fallback={<GradientAvatar seed={`${profile?.id?.slice(0, 6) ?? "you"}-180`} size={96} label={profile?.first_name ?? "U"} />}
              />
            ) : (
              <GradientAvatar seed={`${profile?.id?.slice(0, 6) ?? "you"}-180`} size={96} label={profile?.first_name ?? "U"} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold md:text-3xl">
                  {profile?.first_name ?? "You"}
                  {profile?.age ? <span className="ml-2 text-muted-foreground font-normal">{profile.age}</span> : null}
                </h1>
                {profile?.verified && <VerifiedBadge />}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {[profile?.city, profile?.country].filter(Boolean).join(", ") || "Location not set"}
              </div>
              {profile?.archetype && (
                <div className="mt-2 inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  {profile.archetype}
                </div>
              )}
            </div>
            <a
              href="/onboarding?edit=1"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              <Pencil className="h-4 w-4" /> Edit profile
            </a>


          </div>
        </div>

        {/* Profile completion */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-bold">Profile completion</div>
            <div className="font-mono text-sm text-muted-foreground">{completion}%</div>
          </div>
          <div className="mt-3"><Progress value={completion} /></div>
          {missing.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              Still missing: <span className="text-foreground">{missing.join(" · ")}</span>
            </div>
          )}
        </div>

        {/* About */}
        <Section title="About me">
          {profile?.bio ? (
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{profile.bio}</p>
          ) : (
            <Empty>Add a short bio so matches know your vibe.</Empty>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Relationship intent" value={intent ?? "—"} />
            <Field label="Language" value={profile?.preferred_language ?? "—"} />
          </div>
        </Section>

        {/* Photos & Avatar */}
        <Section title="Photos & avatar"
          action={
            <Link to="/avatar" className="text-xs font-medium text-primary hover:underline">Edit avatar →</Link>
          }
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Profile photo</div>
              <div className="mt-2">
                {displayPhoto ? (
                  <SignedImage src={displayPhoto} alt="Profile" className="h-24 w-24 rounded-2xl object-cover" fallback={<div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface text-xs text-muted-foreground">…</div>} />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface text-xs text-muted-foreground">None</div>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Avatar ({profile?.avatar_style ?? "real"})</div>
              <div className="mt-2">
                {profile?.avatar_url ? (
                  <SignedImage src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover" fallback={<GradientAvatar seed={`${profile?.id?.slice(0, 6) ?? "you"}-220`} size={96} label={profile?.first_name ?? "U"} />} />
                ) : (
                  <GradientAvatar seed={`${profile?.id?.slice(0, 6) ?? "you"}-220`} size={96} label={profile?.first_name ?? "U"} />
                )}
              </div>
            </div>
            <div className="ml-auto flex flex-col gap-2">
              <a href="/onboarding?edit=1" className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface text-center">Edit photos</a>
              <Link to="/avatar" className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-medium hover:bg-surface text-center">Edit avatar</Link>
            </div>

          </div>
        </Section>

        {/* Interests */}
        <Section title="Interests">
          {profile?.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs text-foreground">{i}</span>
              ))}
            </div>
          ) : (
            <Empty>Add a few interests to spark better matches.</Empty>
          )}
        </Section>

        {/* Voice prompts */}
        <Section title="Voice prompts" action={
          <Link to="/passport" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Mic className="h-3 w-3" /> Record more
          </Link>
        }>
          {voices.length === 0 ? (
            <Empty>No voice prompts yet — your voice helps matches feel real.</Empty>
          ) : (
            <ul className="space-y-3">
              {voices.map((v) => (
                <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-3">
                  <button
                    onClick={() => togglePlay(v)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow"
                    aria-label={playingId === v.id ? "Pause" : "Play"}
                  >
                    {playingId === v.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.prompt}</div>
                    <div className="text-xs text-muted-foreground">{v.duration_seconds ?? 0}s</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Compatibility insights */}
        <Section title="Compatibility insights">
          {Object.keys(rhythm).length === 0 && Object.keys(axes).length === 0 && Object.keys(breakdown).length === 0 ? (
            <Empty>Play a few games and answer daily questions to unlock your insights.</Empty>
          ) : (
            <div className="space-y-4">
              {Object.keys(rhythm).length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Emotional rhythm</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(rhythm).map(([k, v]) => (
                      <Bar key={k} label={k} value={Number(v) || 0} />
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(breakdown).length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Readiness</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(breakdown).map(([k, v]) => (
                      <Bar key={k} label={k.replace(/_/g, " ")} value={Number(v) || 0} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Quick actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link to="/passport" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-surface/60">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Passport</div>
              <div className="text-xs text-muted-foreground">Badges & achievements</div>
            </div>
          </Link>
          <Link to="/settings" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-surface/60">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Settings</div>
              <div className="text-xs text-muted-foreground">Privacy, account, subscription</div>
            </div>
          </Link>
          <Link to="/verify" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-surface/60">
            <span className="h-5 w-5 text-primary"><VerifiedBadge /></span>
            <div>
              <div className="text-sm font-medium">{profile?.verified ? "Verified" : "Get verified"}</div>
              <div className="text-xs text-muted-foreground">Trust badge for your profile</div>
            </div>
          </Link>
        </div>

        {/* Danger zone */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-6">
          <div className="font-display text-lg font-bold">Start over</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Restart the profile setup from the beginning (your saved answers stay), or permanently delete your account in Settings.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!user) return;
                if (!confirm("Restart profile setup? You'll be taken back to the first step.")) return;
                await supabase.from("profiles").update({ onboarding_complete: false }).eq("id", user.id);
                window.location.href = "/onboarding";
              }}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface/80"
            >
              Restart profile setup
            </button>
            <Link to="/settings" className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20">
              Delete account
            </Link>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{v}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full bg-gradient-hero" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
