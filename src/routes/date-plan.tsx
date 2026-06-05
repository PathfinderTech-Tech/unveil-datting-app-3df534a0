import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SafetyReminder } from "@/components/SafetyReminder";
import { PartnerPicker, usePartner } from "@/components/PartnerPicker";
import { GuidedFirstDate } from "@/components/GuidedFirstDate";
import { VerificationGate } from "@/components/VerificationGate";
import { useVerification } from "@/hooks/use-verification";
import { proposeDate, loadDatePlans, respondToDatePlan, type DatePlan } from "@/lib/social-api";
import { Coffee, Utensils, BookOpen, Mountain, Image, Trees, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type SearchParams = { u?: string };

export const Route = createFileRoute("/date-plan")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ u: typeof s.u === "string" ? s.u : undefined }),
  head: () => ({
    meta: [
      { title: "Plan Your Date — UNVEIL" },
      { name: "description", content: "Pick a theme, suggest a place, propose a time — together." },
    ],
  }),
  component: DatePlanRoute,
});

const THEMES = [
  { id: "coffee", label: "Coffee", icon: Coffee, hint: "Quiet café, real talk." },
  { id: "dinner", label: "Dinner", icon: Utensils, hint: "Slow plates, longer stories." },
  { id: "museum", label: "Museum", icon: Image, hint: "Wander, react, debate." },
  { id: "bookstore", label: "Bookstore", icon: BookOpen, hint: "Pick a book for each other." },
  { id: "adventure", label: "Adventure", icon: Mountain, hint: "Move, sweat, laugh." },
  { id: "picnic", label: "Picnic", icon: Trees, hint: "Outdoors, blanket, simple." },
];

function DatePlanRoute() {
  const search = useSearch({ from: "/date-plan" }) as SearchParams;
  const { partner, partners, partnerId, setPartnerId, loading } = usePartner(search.u);
  const verification = useVerification();
  const verifiedOk = verification.loading || verification.verified;

  const [theme, setTheme] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => { loadDatePlans().then(setPlans); }, []);
  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)));
  }, []);

  async function submit() {
    if (!partner || !theme) return;
    setBusy(true);
    const res = await proposeDate({
      inviteeId: partner.userId,
      dateType: theme,
      location: location || undefined,
      notes: notes || undefined,
      proposedAt: when ? new Date(when).toISOString() : null,
    });
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`Proposal sent to ${partner.name}.`);
    setTheme(null); setLocation(""); setNotes(""); setWhen("");
    loadDatePlans().then(setPlans);
  }

  async function respond(planId: string, status: "accepted" | "declined") {
    const { error } = await respondToDatePlan(planId, status);
    if (error) { toast.error(error); return; }
    toast.success(status === "accepted" ? "Accepted ✓" : "Declined");
    loadDatePlans().then(setPlans);
  }

  const incoming = plans.filter((p) => me && p.inviteeId === me && p.status === "pending");
  const outgoing = plans.filter((p) => me && p.proposerId === me);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Date Planning</div>
          <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">
            Design the <span className="italic text-gradient-hero">first chapter</span>.
          </h1>
          <p className="mt-3 text-muted-foreground">Pick a theme, suggest a place, propose a time. They confirm.</p>
        </div>

        <SafetyReminder compact />

        {incoming.length > 0 && (
          <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/5 p-6">
            <div className="mb-3 font-display text-lg">Pending invitations</div>
            <div className="space-y-2">
              {incoming.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium">{themeLabel(p.dateType)}{p.location ? ` · ${p.location}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{p.proposedAt ? new Date(p.proposedAt).toLocaleString() : "Any time"} {p.notes && `· ${p.notes}`}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respond(p.id, "accepted")} className="rounded-full bg-gradient-hero px-4 py-1.5 text-xs text-primary-foreground shadow-glow"><Check className="inline h-3 w-3" /> Accept</button>
                    <button onClick={() => respond(p.id, "declined")} className="rounded-full border border-border px-4 py-1.5 text-xs"><X className="inline h-3 w-3" /> Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Propose to</div>
          {loading
            ? <div className="text-sm text-muted-foreground">Loading…</div>
            : <PartnerPicker partners={partners} value={partnerId} onChange={setPartnerId} />}
        </section>

        {partner && (
          <>
            <section className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="mb-3 font-display text-xl">Theme</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  const active = theme === t.id;
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface/40 hover:border-foreground/30"}`}>
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="font-display text-sm font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.hint}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Place / neighborhood">
                <input value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="A café, area, landmark"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm" />
              </Field>
              <Field label="When (optional)">
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm" />
              </Field>
            </section>

            <section className="mt-4 rounded-3xl border border-border bg-card p-6">
              <Field label="Notes (a small twist)">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. bring your favourite book"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm" rows={2} />
              </Field>
            </section>

            <button disabled={!theme || busy} onClick={submit}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send proposal to {partner.name}
            </button>
          </>
        )}

        {outgoing.length > 0 && (
          <section className="mt-10">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your proposals</div>
            <div className="space-y-2">
              {outgoing.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm">
                  <div>
                    <div className="font-medium">{themeLabel(p.dateType)}{p.location ? ` · ${p.location}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{p.proposedAt ? new Date(p.proposedAt).toLocaleString() : "Any time"}</div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <GuidedFirstDate />
        </div>
      </div>
    </div>
  );
}


function themeLabel(id: string) { return THEMES.find((t) => t.id === id)?.label ?? id; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 md:p-0 md:border-0 md:bg-transparent">
      <label className="font-display text-sm">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  const color = status === "accepted" ? "border-neon/40 bg-neon/10 text-foreground"
    : status === "declined" ? "border-accent/40 bg-accent/10 text-muted-foreground"
    : "border-border bg-surface text-muted-foreground";
  return <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${color}`}>{status}</span>;
}
