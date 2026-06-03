import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — UNVEIL" },
      { name: "description", content: "The standards we hold for every member of UNVEIL." },
      { property: "og:title", content: "Community Guidelines — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/community-guidelines" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/community-guidelines" }],
  }),
  component: Guidelines,
});

function Guidelines() {
  return (
    <LegalShell title="Community Guidelines" updated="June 2026">
      <p>UNVEIL is for adults who want intentional, emotionally honest connection. These rules protect that space.</p>

      <LegalSection title="Be real">
        <p>Use your real first name and recent photos of yourself. Catfishing, impersonation, and AI-generated identities are immediate grounds for removal.</p>
      </LegalSection>
      <LegalSection title="Be kind">
        <p>Harassment, hate speech, slurs, threats, or sexual content directed at someone who hasn't consented are not tolerated. One report is enough to trigger review.</p>
      </LegalSection>
      <LegalSection title="No solicitation">
        <p>UNVEIL is not for sex work, escorting, sugar arrangements, MLM, crypto pitches, or any commercial solicitation. Accounts engaging in these activities are removed.</p>
      </LegalSection>
      <LegalSection title="No minors">
        <p>You must be 18+. Profiles of or referencing minors are reported to authorities and permanently banned.</p>
      </LegalSection>
      <LegalSection title="Safe meetings">
        <p>If you decide to meet, follow our <a href="/safety" className="text-accent underline">Safety guide</a>. UNVEIL is not responsible for what happens offline, but we will support you with reports when something does.</p>
      </LegalSection>
      <LegalSection title="Privacy of others">
        <p>Do not share screenshots, voice notes, or contact details of other members outside UNVEIL without their explicit consent.</p>
      </LegalSection>
      <LegalSection title="Reporting & enforcement">
        <p>Use the report button on any profile or message. Our team reviews within 24 hours. Consequences range from warnings to permanent removal and, in serious cases, legal referral.</p>
      </LegalSection>
    </LegalShell>
  );
}
