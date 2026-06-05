import { useEffect, useState } from "react";
import { Sparkles, MapPin, ShieldCheck, MessageCircle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("first_name, age, city, country, archetype, bio, verified, beta_member, readiness_score")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setP((data as PassportProfile) ?? null);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const archetype = (p?.archetype || "signal").toLowerCase();
  const tagline = ARCHETYPE_TAGLINES[archetype] ?? "Your signature is still forming.";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-deep p-7 shadow-glow md:p-9">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            UNVEIL Identity
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-display text-3xl font-light md:text-4xl">
              {p?.first_name || "Your name"}
              {p?.age ? <span className="text-foreground/60">, {p.age}</span> : null}
            </h2>
            {p?.verified && <VerifiedBadge size="md" />}
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
            className="rounded-full border border-primary/30 bg-gradient-hero px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[var(--shadow-logo)] hover:opacity-95"
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

      {p?.bio && (
        <p className="relative mt-4 text-sm leading-relaxed text-foreground/80 line-clamp-3">{p.bio}</p>
      )}

      <div className="relative mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          Readiness {p?.readiness_score ?? 0}/100
        </span>
        {p?.beta_member && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">Beta member</span>}
      </div>
      <ChemistryBadge />
    </div>
  );
}
