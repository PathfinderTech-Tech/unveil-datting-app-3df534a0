import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";
import { Mail, Shield, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact UNVEIL" },
      { name: "description", content: "Reach the UNVEIL team for support, safety reports, press, or partnerships." },
      { property: "og:title", content: "Contact UNVEIL" },
      { property: "og:url", content: "https://unveil.best/contact" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <LegalShell title="Contact us" updated="June 2026">
      <p>The UNVEIL team responds to every message within 48 hours.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card icon={<Mail className="h-5 w-5" />} title="Support" email="support@unveil.best">
          Account help, billing, verification, general questions.
        </Card>
        <Card icon={<Shield className="h-5 w-5" />} title="Safety & trust" email="support@unveil.best">
          Report harassment, impersonation, or safety concerns.
        </Card>
        <Card icon={<AlertTriangle className="h-5 w-5" />} title="Legal & privacy" email="support@unveil.best">
          GDPR / CCPA data requests, takedowns, law enforcement.
        </Card>
        <Card icon={<Mail className="h-5 w-5" />} title="Press & partnerships" email="support@unveil.best">
          Media inquiries, collaborations, integrations.
        </Card>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        For urgent safety issues, please also follow the steps on our{" "}
        <a href="/safety" className="text-accent underline">Safety</a> page.
      </p>
    </LegalShell>
  );
}

function Card({
  icon,
  title,
  email,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-accent">
        {icon}
      </div>
      <h3 className="font-display text-lg font-light">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      <div className="mt-3"><MailActions email={email} /></div>
    </div>
  );
}
