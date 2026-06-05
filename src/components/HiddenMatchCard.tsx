import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Eye, Heart } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { HiddenMatch } from "@/lib/hidden-matches.functions";

const TAGLINES = [
  "Your perfect match may not be your type.",
  "Discover the connections you would normally overlook.",
  "Compatibility beyond attraction.",
  "Where contrast becomes chemistry.",
];

export function HiddenMatchCard({
  match,
  taglineSeed,
  onView,
  onWhy,
  onLike,
}: {
  match: HiddenMatch;
  taglineSeed: number;
  onView?: () => void;
  onWhy: () => void;
  onLike?: () => void;
}) {
  if (match.locked) {
    return (
      <div className="relative flex flex-col overflow-hidden rounded-3xl border border-accent/40 bg-card p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="relative">
              <div style={{ filter: "blur(10px)" }}>
                <Avatar seed={match.id.slice(0, 6) + "-180"} size={56} label="Opposite" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">Opposite Match</div>
              <div className="font-display text-2xl font-bold text-gradient-aura">{match.complementaryScore}%</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Complementary</div>
            </div>
          </div>
          <p className="mt-4 font-display text-base italic text-foreground/80">
            "{TAGLINES[taglineSeed % TAGLINES.length]}"
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Premium reveals identity, "Why we match" insights, and chat.</p>
          <Link
            to="/premium"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Sparkles className="h-4 w-4" /> Unlock with Premium
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-3xl border border-accent/30 bg-card p-5 transition-all hover:-translate-y-1 hover:border-accent hover:shadow-glow">
      <button onClick={onView} className="text-left">
        <div className="flex items-start justify-between">
          <div className="relative">
            <Avatar seed={match.id.slice(0, 6) + "-180"} size={56} label={match.firstName ?? "Hidden"} />
            <div className="absolute -bottom-1 -right-1 rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase text-accent-foreground">
              Hidden
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Complementary</div>
            <div className="font-display text-2xl font-bold text-gradient-aura">{match.complementaryScore}%</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Similarity {match.similarityScore}%
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="font-display text-lg">{match.firstName ?? "—"}{match.age ? `, ${match.age}` : ""}</p>
          <p className="text-xs text-muted-foreground">{[match.city, match.country].filter(Boolean).join(" · ") || "—"}</p>
        </div>

        {match.sharedValues.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-foreground/85">
            {match.sharedValues.slice(0, 2).map((s) => (
              <li key={s} className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3 w-3 text-primary" /> {s}</li>
            ))}
          </ul>
        )}
        {match.growthOpportunities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.growthOpportunities.slice(0, 2).map((g) => (
              <span key={g} className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{g}</span>
            ))}
          </div>
        )}
      </button>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onWhy}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-accent/40 bg-accent/10 py-2 text-xs font-medium text-accent hover:bg-accent/20"
        >
          <Eye className="h-3.5 w-3.5" /> Why we match
        </button>
        {onLike && (
          <button
            onClick={onLike}
            aria-label="Like"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow"
          >
            <Heart className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
