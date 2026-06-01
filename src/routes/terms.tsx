import { createFileRoute } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — UNVEIL" }] }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-invert">
        <h1 className="font-display text-5xl font-light">Terms & Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="mt-10 space-y-6 text-sm text-foreground/85 leading-relaxed">
          <Section title="1. Eligibility">
            You must be at least 18 years old to use UNVEIL. By creating an account you confirm you meet this requirement.
          </Section>
          <Section title="2. Responsibility for interactions">
            You are solely responsible for your interactions with other users, both on the platform and offline. UNVEIL does not screen members beyond standard verification and does not guarantee compatibility or safety.
          </Section>
          <Section title="3. Community guidelines">
            Abusive, fraudulent, harmful, sexually exploitative, harassing, impersonating, hateful, or illegal behavior is strictly prohibited. Violations result in immediate account termination.
          </Section>
          <Section title="4. Meetings & caution">
            UNVEIL strongly recommends meeting in public, telling a trusted person your plans, and using your own transport. Never share financial information with another user.
          </Section>
          <Section title="5. Limitation of liability">
            To the maximum extent permitted by law, UNVEIL is not liable for user conduct, offline meetings, personal disputes, emotional harm, financial loss, or user-generated content.
          </Section>
          <Section title="6. Reports">
            You may report any issues to <a href="mailto:support@unveil.best" className="text-accent underline">support@unveil.best</a>. Our team reviews reports and may take moderation action at its discretion.
          </Section>
          <Section title="7. Privacy">
            UNVEIL processes personal data (including photos and voice prompts) to provide the service. You retain ownership of your content and may delete your account and data at any time.
          </Section>
          <Section title="8. Subscriptions">
            Paid subscriptions (UNVEIL+, UNVEIL Black) renew automatically until cancelled. Cancel anytime via your account settings.
          </Section>
          <Section title="9. Changes">
            We may update these terms. Material changes will be communicated in-app. Continued use after changes constitutes acceptance.
          </Section>
        </div>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-light text-foreground">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
