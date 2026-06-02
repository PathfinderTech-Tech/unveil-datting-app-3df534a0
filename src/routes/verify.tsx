import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Camera, IdCard, Image as ImageIcon, ShieldCheck, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verified Profile — UNVEIL" },
      { name: "description", content: "Selfie + identity verification. Increase trust and reduce fake accounts." },
    ],
  }),
  component: Verify,
});

const STEPS = [
  { icon: Camera, title: "Selfie verification", body: "Take a quick live selfie. Used only for verification." },
  { icon: IdCard, title: "Basic identity check", body: "Confirm your name and age with a government ID." },
  { icon: ImageIcon, title: "Photo comparison", body: "We compare your selfie to your profile photos." },
];

function Verify() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-3xl px-5 py-14 md:py-20">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.16_240)] to-[oklch(0.55_0.22_270)] text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl font-light md:text-5xl">
            Get your <span className="text-gradient-aura italic">Verified</span> badge
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            A simple three-step process that earns you a blue badge across the platform — increasing trust and
            visibility.
          </p>
          <div className="mt-4 flex justify-center">
            <VerifiedBadge size="md" showDate date="Today" />
          </div>
        </div>

        {!done ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-7 md:p-9">
            <div className="mb-6 flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-hero" : "bg-surface-2"}`}
                />
              ))}
            </div>
            <Step icon={STEPS[step].icon} title={STEPS[step].title} body={STEPS[step].body} index={step} />

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-xs text-muted-foreground disabled:opacity-30"
              >
                ← Back
              </button>
              <button
                onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : setDone(true))}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                {step < STEPS.length - 1 ? "Continue" : "Submit verification"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-primary bg-card p-9 text-center shadow-glow">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-3xl">Verification submitted</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              We typically review within 24 hours. You'll get a notification once your blue badge is live.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/matches"
                className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                Back to matches
              </Link>
              <Link
                to="/premium"
                className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2"
              >
                Membership
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <Pricing
            title="One-time"
            price="$9.99"
            note="Pay once. Badge stays on your profile."
            cta={{ label: "Pay $9.99", to: "/checkout", product: "verified" }}
          />
          <Pricing
            title="Included with Premium"
            price="Free"
            note="Verification is included with any UNVEIL Premium plan."
            cta={{ label: "Upgrade to Premium", to: "/checkout", product: "premium" }}
            highlight
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your verification photos are private and used only to confirm identity.
        </p>
      </section>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
  index,
}: {
  icon: any;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground shadow-glow">
        <Icon className="h-7 w-7" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
        Step {index + 1} of 3
      </div>
      <h3 className="mt-2 font-display text-2xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
        Camera / upload area
      </div>
    </div>
  );
}

function Pricing({
  title,
  price,
  note,
  cta,
  highlight,
}: {
  title: string;
  price: string;
  note: string;
  cta: { label: string; to: string; product: "premium" | "verified" };
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{title}</div>
      <div className="mt-1 font-display text-3xl">{price}</div>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <Link
        to={cta.to}
        search={{ product: cta.product, plan: "3" } as any}
        className={`mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium ${
          highlight
            ? "bg-gradient-hero text-primary-foreground shadow-glow"
            : "border border-border bg-surface hover:bg-surface-2"
        }`}
      >
        {cta.label}
      </Link>
    </div>
  );
}
