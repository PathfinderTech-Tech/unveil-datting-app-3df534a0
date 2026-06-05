import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPassport, type PublicPassport } from "@/lib/public-passport.functions";

export const Route = createFileRoute("/p/$userId")({
  loader: async ({ params }) => {
    const passport = await loadPublicPassport({ data: { userId: params.userId } });
    return { passport };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.passport as PublicPassport | null | undefined;
    if (!p) {
      return {
        meta: [
          { title: "UNVEIL Passport" },
          { name: "description", content: "Slow love, real connection — UNVEIL." },
          { property: "og:title", content: "UNVEIL Passport" },
          { property: "og:description", content: "Slow love, real connection." },
        ],
      };
    }
    const name = p.firstName ?? "Someone";
    const archetype = (p.archetype ?? "Signal").replace(/-/g, " ");
    const loc = [p.city, p.country].filter(Boolean).join(", ");
    const verifiedTag = p.verified ? " · Verified" : "";
    const title = `${name}'s UNVEIL Passport — ${archetype}${verifiedTag}`;
    const description = loc
      ? `${name} · ${archetype}${verifiedTag} · ${loc}. Slow love, real connection on UNVEIL.`
      : `${name} · ${archetype}${verifiedTag}. Slow love, real connection on UNVEIL.`;
    const image = p.avatarUrl ?? p.photoUrl ?? p.profilePhotoUrl ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
    };
  },
  component: PublicPassportPage,
});

function PublicPassportPage() {
  const { passport } = Route.useLoaderData() as { passport: PublicPassport | null };

  if (!passport) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-6 py-20">
        <div className="text-center">
          <h1 className="font-display text-3xl">Passport not found</h1>
          <p className="mt-2 text-muted-foreground">This UNVEIL Passport isn't available.</p>
          <a href="/" className="mt-6 inline-flex rounded-full bg-gradient-hero px-6 py-3 text-sm text-primary-foreground shadow-glow">
            Visit UNVEIL
          </a>
        </div>
      </main>
    );
  }

  const name = passport.firstName ?? "Someone";
  const loc = [passport.city, passport.country].filter(Boolean).join(" · ") || "Somewhere on Earth";
  const archetype = (passport.archetype ?? "Signal").replace(/-/g, " ");
  const score = passport.readinessScore ?? 0;
  const photo = passport.avatarUrl ?? passport.photoUrl ?? passport.profilePhotoUrl;

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-md">
        <a href="/" className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-accent">
          UNVEIL · slow love, real connection
        </a>

        <article className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
          <div
            className="relative aspect-[4/5] w-full"
            style={{
              background:
                "radial-gradient(120% 80% at 80% 10%, color-mix(in oklab, var(--logo-magenta) 40%, transparent) 0%, transparent 60%), linear-gradient(135deg, #13091f 0%, #261044 60%, #09070d 100%)",
            }}
          >
            {photo && (
              <img
                src={photo}
                alt={`${name}'s avatar`}
                className="absolute right-6 top-6 h-32 w-32 rounded-full border-2 object-cover shadow-glow"
                style={{ borderColor: "color-mix(in oklab, var(--logo-magenta) 60%, transparent)" }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 p-6 text-foreground">
              <div className="font-mono text-[11px] uppercase tracking-luxury text-accent">UNVEIL Identity</div>
              <h1 className="mt-2 font-display text-4xl font-light leading-tight text-foreground">{name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{loc}</div>

              <div className="mt-5 h-px w-12 bg-gradient-hero" />
              <div className="mt-5 font-mono text-[10px] uppercase tracking-luxury text-accent">Archetype</div>
              <div className="font-display text-2xl capitalize text-foreground">{archetype}</div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-surface/40 p-3">
                  <div className="text-[10px] uppercase tracking-luxury text-muted-foreground">Readiness</div>
                  <div className="mt-1 font-display text-2xl">
                    {score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface/40 p-3">
                  <div className="text-[10px] uppercase tracking-luxury text-muted-foreground">Approach</div>
                  <div className="mt-1 font-display text-lg leading-tight">Slow dating</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Want a Passport like this?{" "}
          <a href="/" className="text-primary underline">Start on UNVEIL</a>
        </div>
      </div>
    </main>
  );
}
