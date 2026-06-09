import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — UNVEIL" },
      { name: "description", content: "The terms that govern your use of UNVEIL." },
      { property: "og:title", content: "Terms of Service — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/terms" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="June 2026">
      <p>
        These Terms govern your use of UNVEIL, operated by{" "}
        <strong>PathfinderTech, Inc.</strong> ("UNVEIL", "we") at{" "}
        <a className="text-accent underline" href="https://unveil.best">unveil.best</a>.
        By creating an account you agree to these Terms.
      </p>

      <LegalSection title="1. Eligibility (18+ only)">
        <p>You must be at least 18 years old and legally able to enter contracts in your country. Accounts of minors are removed and reported.</p>
      </LegalSection>

      <LegalSection title="2. Account creation">
        <p>You must provide accurate information, use your real first name, recent photos of yourself, and a real, unique email. One account per person. You are responsible for your password and any activity on your account.</p>
      </LegalSection>

      <LegalSection title="3. User responsibilities">
        <p>You are solely responsible for your interactions with other members, on and off the platform. UNVEIL does not conduct criminal background checks and does not guarantee compatibility, safety, or the conduct of any member.</p>
      </LegalSection>

      <LegalSection title="4. Community behavior">
        <p>Treat other members with respect. Follow our <a className="text-accent underline" href="/community-guidelines">Community Guidelines</a>. Violations may result in warnings, suspension, or permanent removal at our sole discretion.</p>
      </LegalSection>

      <LegalSection title="5. Prohibited conduct">
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Fake profiles</strong>, catfishing, AI-generated identities.</li>
          <li><strong>Impersonation</strong> of any person, brand, or public figure.</li>
          <li><strong>Harassment</strong>, threats, stalking, doxxing, or hate speech.</li>
          <li>Discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any protected category.</li>
          <li>Sex work, escorting, sugar arrangements, MLM, crypto pitches, or any commercial solicitation.</li>
          <li>Explicit sexual content, nudity, or sexual content involving anyone who has not consented.</li>
          <li>Sharing other members' private content or contact details outside UNVEIL.</li>
          <li>Scraping, reverse-engineering, automated access, or circumventing rate limits or security.</li>
          <li>Any illegal activity, including content involving minors, which is reported to authorities.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Payment terms and subscriptions">
        <p>UNVEIL+ and UNVEIL Black are paid subscriptions billed by Stripe on 1, 3, 6, or 12-month cycles. <strong>Subscriptions auto-renew</strong> at the then-current price until cancelled. Cancel anytime from Settings → Manage Subscription. Refunds are handled under our <a className="text-accent underline" href="/refund">Refund Policy</a>. App Store and Play Store purchases are governed by those stores' billing terms.</p>
      </LegalSection>

      <LegalSection title="7. Premium features">
        <p>Premium plans unlock features such as unlimited Unexpected Matches, advanced filters, voice intros at full quality, accelerated reveal journeys, and priority support. Features and pricing may change with notice.</p>
      </LegalSection>

      <LegalSection title="8. Suspension and termination">
        <p>We may suspend or terminate any account that violates these Terms, our Community Guidelines, or applicable law, with or without notice. You may delete your account anytime from Settings.</p>
      </LegalSection>

      <LegalSection title="9. Intellectual property">
        <p>UNVEIL, the wordmark, logo, and all platform software are owned by PathfinderTech, Inc. You retain ownership of your content. By posting content, you grant UNVEIL a worldwide, royalty-free license to host, display, and process it for the purpose of operating the service.</p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>To the maximum extent permitted by law, UNVEIL is not liable for member conduct, offline meetings, emotional or physical harm, financial loss, or user-generated content. UNVEIL's total liability for any claim is limited to the amount you paid us in the prior 12 months. Some jurisdictions do not allow these limitations — they apply to you to the extent permitted by law.</p>
      </LegalSection>

      <LegalSection title="11. Indemnification">
        <p>You agree to indemnify and hold UNVEIL harmless from claims arising out of your content, your use of the service, or your violation of these Terms.</p>
      </LegalSection>

      <LegalSection title="12. Governing law and disputes">
        <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-laws rules. Disputes are resolved in the state or federal courts of Delaware, except where mandatory consumer-protection law in your country of residence requires otherwise. EU and UK consumers retain rights under their local law.</p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>We may update these Terms; material changes are announced in-app and by email. Continued use after changes constitutes acceptance.</p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>PathfinderTech, Inc.</p>
        <div className="mt-2"><MailActions subject="Terms question" /></div>
      </LegalSection>
    </LegalShell>
  );
}
