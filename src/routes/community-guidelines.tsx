import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";

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
      <p>
        UNVEIL exists for adults seeking intentional, emotionally honest
        connection. These rules protect that space. They apply to every member,
        on every surface of the product. Operated by PathfinderTech, Inc.
      </p>

      <LegalSection title="Respectful communication">
        <p>Speak to other members the way you would in person. Disagreement is fine; cruelty is not. Repeated rude or contemptuous messages will be moderated even if no single message crosses a clear line.</p>
      </LegalSection>

      <LegalSection title="Authentic profiles">
        <p>Use your real first name, your real age, and recent photos of yourself. No catfishing, no impersonation of other people or brands, no AI-generated identities. Verified members get a checkmark.</p>
      </LegalSection>

      <LegalSection title="No harassment">
        <p>No threats, stalking, doxxing, unwanted sexual messages, or repeated contact after someone has unmatched or blocked you.</p>
      </LegalSection>

      <LegalSection title="No hate speech">
        <p>No slurs, dehumanizing language, or content that promotes violence against any group.</p>
      </LegalSection>

      <LegalSection title="No discrimination">
        <p>Filtering for compatibility is fine. Rejecting or attacking people because of race, ethnicity, religion, disability, gender identity, or sexual orientation is not.</p>
      </LegalSection>

      <LegalSection title="No scams">
        <p>No requests for money, gift cards, crypto, investments, or financial information. No phishing links. No "verify your account" tricks.</p>
      </LegalSection>

      <LegalSection title="No solicitation">
        <p>UNVEIL is not for sex work, escorting, sugar arrangements, MLM, OnlyFans promotion, or any commercial pitch.</p>
      </LegalSection>

      <LegalSection title="No explicit content">
        <p>No nudity, sexual content, or sexually suggestive content in profiles or chats unless both members have explicitly consented and the content does not involve anyone else. Unsolicited explicit images are an immediate ban.</p>
      </LegalSection>

      <LegalSection title="No underage users">
        <p>You must be 18+. Profiles of or referencing minors are removed and reported to authorities.</p>
      </LegalSection>

      <LegalSection title="Safety recommendations">
        <p>If you meet offline, meet in a public place, tell a trusted person, arrange your own transport, never share financial details. See our <a className="text-accent underline" href="/safety">Safety guide</a> for the full checklist.</p>
      </LegalSection>

      <LegalSection title="Reporting process">
        <p>Use the in-app report button on any profile, message, or photo. You can also email <a className="text-accent underline" href="mailto:support@unveil.best">support@unveil.best</a> or use the form on our <a className="text-accent underline" href="/support">Support Center</a>. Our trust team reviews every report within 24 hours. Consequences range from warnings to permanent removal and, in serious cases, legal referral.</p>
        <div className="mt-2"><MailActions subject="Community report" /></div>
      </LegalSection>
    </LegalShell>
  );
}
