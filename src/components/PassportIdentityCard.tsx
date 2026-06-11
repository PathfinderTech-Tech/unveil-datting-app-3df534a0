import { useEffect, useState } from "react";
import { Sparkles, MapPin, ShieldCheck, MessageCircle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LocationTrustBadge } from "@/components/LocationTrustBadge";
import { ChemistryBadge } from "@/components/chemistry/ChemistryBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type PassportProfile = {
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  archetype: string | null;
  bio: string | null;
  verified: boolean | null;
  beta_member: boolean | null;
  readiness_score: number | null;
  avatar_url: string | null;
  photo_url: string | null;
  discovery_mode: "avatar" | "photo" | null;
  communication_style: Record<string, unknown> | null;
  travel_status: string | null;
  travel_expires_at: string | null;
  travel_warning_count: number | null;
  account_restricted: boolean | null;
};

type Blueprint = {
  communication_style: string | null;
  relationship_style: string | null;
};

const ARCHETYPE_TAGLINES: Record<string, string> = {
  architect: "Builds frameworks out of feelings.",
  wanderer: "Loves the texture of unknown places.",
  mirror: "Reflects you back, more clearly.",
  observer: "Notices the things you didn't say.",
  catalyst: "Lights the room and rearranges it.",
  "deep-current": "Quiet on the surface, vast underneath.",
  signal: "Speaks in clear, careful frequencies.",
};

export function PassportIdentityCard({ userId, onShare }: { userId: string; onShare?: () => void }) {
  const [p, setP] = useState<PassportProfile | null>(null);
  const [bp, setBp] = useState<Blueprint | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("first_name, age, city, country, archetype, bio, verified, beta_member, readiness_score, avatar_url, photo_url, profile_photo_url, discovery_mode, communication_style, travel_status, travel_expires_at, travel_warning_count, account_restricted")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) {
          const row = data as (PassportProfile & { profile_photo_url?: string | null }) | null;
          if (row) row.photo_url = row.profile_photo_url ?? row.photo_url ?? null;
          setP(row);
        }
      });
    supabase
      .from("personality_blueprint")
      .select("communication_style, relationship_style")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setBp((data as Blueprint) ?? null);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const archetype = (p?.archetype || "signal").toLowerCase();
  const tagline = ARCHETYPE_TAGLINES[archetype] ?? "Your signature is still forming.";
  const trustScore = p?.readiness_score ?? 0;
  const trustLabel = trustScore >= 80 ? "High" : trustScore >= 50 ? "Building" : "New";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-deep p-7 shadow-glow md:p-9">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />


      <div className="relative flex items-start gap-4">
        <ProfileAvatar
          userId={userId}
          name={p?.first_name}
          discoveryMode={p?.discovery_mode}
          avatarUrl={p?.avatar_url}
          photoUrl={p?.photo_url}
          size={80}
          rounded="2xl"
          className="border border-primary/30 shadow-glow"
        />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            UNVEIL Identity
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-display text-3xl font-light md:text-4xl">
              {p?.first_name || "Your name"}
              {p?.age ? <span className="text-foreground/60">, {p.age}</span> : null}
            </h2>
            {p?.verified && <VerifiedBadge size="md" />}
            <LocationTrustBadge profile={p as any} size="sm" />

          </div>
          {(p?.city || p?.country) && (
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {[p?.city, p?.country].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        {onShare && (
          <button
            onClick={onShare}
            className="shrink-0 rounded-full border border-primary/30 bg-gradient-hero px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[var(--shadow-logo)] hover:opacity-95"
          >
            Share
          </button>
        )}
      </div>

      <div className="relative mt-6 rounded-2xl border border-primary/20 bg-background/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Archetype
        </div>
        <div className="mt-1 font-display text-xl capitalize">{archetype.replace("-", " ")}</div>
        <p className="mt-1 text-sm italic text-foreground/70">{tagline}</p>
      </div>

      <div className="relative mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Communication
          </div>
          <div className="mt-1 text-sm capitalize text-foreground/85">
            {bp?.communication_style || "Still discovering"}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Heart className="h-3.5 w-3.5" /> Relationship
          </div>
          <div className="mt-1 text-sm capitalize text-foreground/85">
            {bp?.relationship_style || "Still discovering"}
          </div>
        </div>
      </div>

      {p?.bio && (
        <p className="relative mt-4 text-sm leading-relaxed text-foreground/80 line-clamp-3">{p.bio}</p>
      )}

      <div className="relative mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          Trust: <span className="text-foreground/85">{trustLabel}</span>
          <span className="text-foreground/40">· {trustScore}/100</span>
        </span>
        {p?.beta_member && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">Beta member</span>}
      </div>

      <ChemistryBadge />
    </div>
  );
}
