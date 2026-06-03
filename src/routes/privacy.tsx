import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — UNVEIL" },
      { name: "description", content: "How UNVEIL collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="June 2026">
      <p>
        UNVEIL ("we", "us") respects your privacy. This policy explains what we collect, how we use it,
        and the rights you have over your data. UNVEIL is operated as a compatibility-first dating
        platform at <a href="https://unveil.best" className="text-accent underline">unveil.best</a>.
      </p>
      <LegalSection title="1. Information we collect">
        <p>Account data (email, age, gender, location city), profile data (photos, voice prompts, bio, interests), compatibility answers from onboarding quizzes, verification documents when you opt in (selfie, government ID), and usage data (matches, messages, payments).</p>
      </LegalSection>
      <LegalSection title="2. How we use your data">
        <p>To create your profile, compute compatibility scores, surface matches, enable chat, process payments, verify identity, prevent abuse, and improve the product. We do not sell your personal data.</p>
      </LegalSection>
      <LegalSection title="3. Sharing">
        <p>Matched users see your profile, photos, and shared answers. Payments are processed by Stripe. Verification documents are reviewed by our trust team and never shared with other users. We may disclose data if legally required.</p>
      </LegalSection>
      <LegalSection title="4. Storage & security">
        <p>Data is stored on encrypted infrastructure. Photos and IDs are stored in private buckets with row-level access policies. We use industry-standard transport encryption (TLS).</p>
      </LegalSection>
      <LegalSection title="5. Your rights (GDPR / CCPA)">
        <p>You can access, correct, export, or delete your data at any time from Settings, or by emailing us. Deletion is permanent and removes your matches and messages.</p>
        <div className="mt-2"><MailActions /></div>
      </LegalSection>
      <LegalSection title="6. Retention">
        <p>Active accounts: retained while active. Deleted accounts: purged within 30 days. Verification documents: deleted within 90 days of approval or rejection.</p>
      </LegalSection>
      <LegalSection title="7. Children">
        <p>UNVEIL is strictly for users aged 18 and over. We do not knowingly collect data from minors.</p>
      </LegalSection>
      <LegalSection title="8. Changes">
        <p>We will notify you in-app of material changes. Continued use after changes constitutes acceptance.</p>
      </LegalSection>
      <LegalSection title="9. Contact">
        <p>Privacy questions:</p>
        <div className="mt-2"><MailActions subject="Privacy question" /></div>
      </LegalSection>
    </LegalShell>
  );
}
