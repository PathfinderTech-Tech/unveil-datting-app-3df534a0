import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PageBackButton } from "@/components/PageBackButton";
import { MailActions } from "@/components/MailActions";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  LifeBuoy,
  CreditCard,
  Shield,
  Wrench,
  UserCog,
  Flag,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Center — UNVEIL" },
      { name: "description", content: "FAQ, account, billing, safety, and technical support for UNVEIL members." },
      { property: "og:title", content: "Support Center — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/support" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/support" }],
  }),
  component: Support,
});

const FAQ: { q: string; a: string }[] = [
  { q: "How do I create an account?", a: "Tap Sign up, enter your email and a password, confirm your email, and complete onboarding. You must be 18 or older." },
  { q: "How do I reset my password?", a: "On the Login page tap 'Forgot password' and follow the email link. The link is valid for one hour." },
  { q: "How does matching work?", a: "We compute compatibility from your onboarding answers, values, goals, and interests. Profiles below your minimum score are hidden by default." },
  { q: "What is the 7-Day Contact Exchange Journey?", a: "Photos are visible from Day 1 — the veil lifts as soon as a real conversation begins. You then spend up to seven days building rapport through messages and voice notes. The 7-day milestone unlocks the option to exchange phone, email, or social handles — not photos. Premium members and Daily Pass holders can fast-track contact exchange." },
  { q: "How do I cancel my subscription?", a: "Settings → Manage Subscription opens the Stripe portal where you can cancel. Access continues until the end of the paid period." },
  { q: "How do I delete my account?", a: "Settings → Account → Delete Account. Deletion is permanent and removes your profile, matches, and messages within 30 days." },
  { q: "How do I report a user?", a: "Open their profile or chat, tap the three-dot menu, and select Report. Our trust team reviews every report within 24 hours." },
  { q: "Is my data safe?", a: "Yes. Photos and verification selfies are stored in private, encrypted buckets. We never sell your personal data. See our Privacy Policy." },
];

const CATEGORIES = [
  { icon: UserCog, title: "Account support", desc: "Sign-in, profile, verification, deletion." },
  { icon: CreditCard, title: "Billing support", desc: "Subscriptions, refunds, Stripe receipts." },
  { icon: Shield, title: "Safety support", desc: "Reports, blocking, harassment, urgent issues." },
  { icon: Wrench, title: "Technical support", desc: "Bugs, app crashes, photo upload problems." },
];

function Support() {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <LifeBuoy className="mb-4 h-10 w-10 text-accent" />
        <h1 className="font-display text-5xl font-light">Support Center</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          We respond to every message within 48 hours. For urgent safety
          matters, also follow our <Link to="/safety" className="text-accent underline">Safety guide</Link>.
        </p>

        <div className="mt-10 rounded-3xl border border-accent/30 bg-accent/5 p-6 text-center">
          <p className="text-sm text-muted-foreground">Contact our team directly</p>
          <p className="font-display text-2xl font-light">support@unveil.best</p>
          <div className="mt-3 flex justify-center"><MailActions /></div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-accent">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-light">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <div className="mt-3"><MailActions subject={c.title} /></div>
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-display text-3xl font-light">Frequently asked questions</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
        </div>

        <h2 className="mt-16 font-display text-3xl font-light">Report a user</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For fastest action, use the in-app report button on the profile or
          chat. You can also submit a report below.
        </p>
        <ReportForm />
      </section>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-display text-base font-light">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground">{a}</p>}
    </button>
  );
}

function ReportForm() {
  const [reportedUser, setReportedUser] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { data } = await supabase.auth.getUser();
    const body = encodeURIComponent(
      `Reporter: ${data.user?.email ?? "anonymous"}\nReported user: ${reportedUser}\nReason: ${reason}\n\nDetails:\n${details}`
    );
    window.location.href = `mailto:support@unveil.best?subject=${encodeURIComponent("User report")}&body=${body}`;
    setStatus("sent");
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
      <input
        required
        value={reportedUser}
        onChange={(e) => setReportedUser(e.target.value)}
        placeholder="Reported user's name or profile URL"
        className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm"
      />
      <select
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm"
      >
        <option value="">Reason…</option>
        <option>Harassment or threats</option>
        <option>Fake profile / impersonation</option>
        <option>Underage user</option>
        <option>Scam or solicitation</option>
        <option>Hate speech or discrimination</option>
        <option>Explicit / inappropriate content</option>
        <option>Other</option>
      </select>
      <textarea
        required
        rows={5}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="What happened? Include dates, screenshots if possible."
        className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm"
      />
      <button
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground"
      >
        <Flag className="h-3.5 w-3.5" />
        {status === "sent" ? "Email opened" : "Submit report"}
      </button>
    </form>
  );
}
