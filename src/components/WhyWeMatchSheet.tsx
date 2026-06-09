import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { whyWeMatch, type WhyWeMatch } from "@/lib/hidden-matches.functions";
import { X, Sparkles, MessageCircle, TrendingUp, Heart, Shield, Lightbulb } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function WhyWeMatchSheet({
  peerId,
  peerName,
  onClose,
  conversationId,
}: {
  peerId: string;
  peerName?: string | null;
  onClose: () => void;
  conversationId?: string | null;
}) {
  const fetchWhy = useServerFn(whyWeMatch);
  const [data, setData] = useState<WhyWeMatch | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetchWhy({ data: { peerId } });
      if ("error" in r) setErr(r.error);
      else setData(r.data);
    })();
  }, [peerId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 p-4 backdrop-blur-md md:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-accent/30 bg-card shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-surface/60 p-2 hover:bg-surface"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/20 via-accent/15 to-transparent p-6">
          <p className="font-mono text-[10px] uppercase tracking-luxury text-accent">Unexpected Matches · Why we match</p>
          <h2 className="mt-1 font-display text-2xl">{peerName ? `You & ${peerName}` : "Why this could work"}</h2>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          {!data && !err && <p className="text-sm text-muted-foreground">Reading your dynamics…</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Similarity</p>
                  <p className="font-display text-3xl font-bold text-gradient-hero">{data.similarity}%</p>
                </div>
                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-accent">Complementary</p>
                  <p className="font-display text-3xl font-bold text-gradient-aura">{data.complementary}%</p>
                </div>
              </div>

              {data.insight && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-primary">
                    <Sparkles className="h-3 w-3" /> AI Relationship Insight
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{data.insight}</p>
                </div>
              )}

              <Section icon={Heart} title="Shared values" items={data.sharedValues} empty="Build more shared answers in Insights." />
              <Section icon={TrendingUp} title="Growth opportunities" items={data.growthOpportunities} tone="accent" empty="Your axes align tightly — fewer growth deltas." />
              <Section icon={Shield} title="Strengths" items={data.strengths} />
              <Section icon={Lightbulb} title="Challenges to navigate" items={data.challenges} tone="muted" />

              {data.communicationDynamics && (
                <div className="rounded-2xl border border-border bg-surface/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Communication dynamics</p>
                  <p className="mt-1 text-sm">{data.communicationDynamics}</p>
                </div>
              )}

              {data.topics.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <MessageCircle className="h-3 w-3" /> Recommended conversation topics
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {data.topics.map((t, i) => (
                      <li key={i} className="rounded-xl border border-border bg-background/60 px-3 py-2">{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {conversationId && (
                <Link
                  to="/chat"
                  search={{ c: conversationId } as never}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow"
                >
                  <MessageCircle className="h-4 w-4" /> Send an icebreaker
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  tone = "primary",
  empty,
}: {
  icon: any;
  title: string;
  items: string[];
  tone?: "primary" | "accent" | "muted";
  empty?: string;
}) {
  if (!items.length && !empty) return null;
  const cls =
    tone === "accent"
      ? "border-accent/40 bg-accent/10 text-accent"
      : tone === "muted"
        ? "border-border bg-surface/40 text-muted-foreground"
        : "border-primary/30 bg-primary/5 text-primary";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((s) => (
            <span key={s} className={`rounded-full border px-3 py-1 text-xs ${cls}`}>{s}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
