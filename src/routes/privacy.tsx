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
        UNVEIL is operated by <strong>PathfinderTech, Inc.</strong> ("UNVEIL",
        "we", "us") at <a href="https://unveil.best" className="text-accent underline">unveil.best</a>.
        This policy explains what personal data we collect, how we use it, and
        the rights you have. Contact: <a className="text-accent underline" href="mailto:support@unveil.best">support@unveil.best</a>.
      </p>

      <LegalSection title="1. Data we collect">
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Account data</strong>: email, password hash, date of birth, gender, location city, language.</li>
          <li><strong>Profile information</strong>: display name, bio, prompts, interests, values, lifestyle answers, relationship goals.</li>
          <li><strong>Photos and videos</strong> you upload to your profile or send in chat.</li>
          <li><strong>Voice introductions</strong> recorded during onboarding or for reveal journeys.</li>
          <li><strong>Messages and communications</strong> with other members (encrypted at rest).</li>
          <li><strong>Compatibility assessments</strong>: quiz answers, personality blueprint, scores, and AI-derived insights.</li>
          <li><strong>Verification selfies</strong>, collected when you complete the required photo verification.</li>
          <li><strong>Analytics data</strong>: device type, app version, crash reports, feature usage (no advertising IDs).</li>
          <li><strong>Payment information</strong> is processed by Stripe, Inc. UNVEIL never stores full card numbers; we receive only a token and the last four digits.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use your data">
        <p>To create and maintain your account, compute compatibility, surface matches, enable messaging, process payments, verify identity, prevent fraud and abuse, comply with law, and improve the product. We do not sell personal data and do not use it for third-party advertising.</p>
      </LegalSection>

      <LegalSection title="3. Sharing">
        <p>Matched users see your profile, photos, and shared answers. Stripe processes payments. Apple and Google process App Store / Play subscriptions if used. Verification selfies are reviewed by our trust team and never shown to other members. We disclose data when legally required.</p>
      </LegalSection>

      <LegalSection title="4. Storage and security">
        <p>Data is stored on encrypted infrastructure inside the EU and US. Photos and verification selfies live in private buckets with row-level access policies. Transport is TLS 1.2+. We run security scans, RLS, and access logging.</p>
      </LegalSection>

      <LegalSection title="5. Account deletion and data export">
        <p>You can <strong>export</strong> all your data from Settings → Privacy → Export, or <strong>delete</strong> your account from Settings → Account → Delete. Deletion is permanent: profile, matches, messages, and uploads are purged within 30 days. Audit logs required by law are retained up to 12 months.</p>
        <div className="mt-2"><MailActions subject="Data export / deletion request" /></div>
      </LegalSection>

      <LegalSection title="6. GDPR (EU / UK)">
        <p>If you are in the EEA, UK, or Switzerland, you have rights to access, rectify, erase, restrict, and port your data, and to object to processing. Our legal bases are: contract (to provide the service), legitimate interest (safety and abuse prevention), consent (verification, marketing), and legal obligation. Lodge complaints with your local supervisory authority. Our EU representative can be reached at support@unveil.best.</p>
      </LegalSection>

      <LegalSection title="7. CCPA / CPRA (California)">
        <p>California residents may request to know, delete, correct, and limit use of their personal information, and to opt out of sale or sharing. <strong>UNVEIL does not sell or share personal information.</strong> Submit requests to support@unveil.best — we will not discriminate against you for exercising these rights.</p>
      </LegalSection>

      <LegalSection title="8. Children's privacy">
        <p>UNVEIL is strictly 18+. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, email support@unveil.best and we will remove it immediately and report as required by law.</p>
      </LegalSection>

      <LegalSection title="9. International users">
        <p>If you use UNVEIL from outside the US, your data is transferred to the US and the EU. We rely on Standard Contractual Clauses for transfers from the EEA/UK and apply equivalent protections. By using UNVEIL, you consent to this transfer.</p>
      </LegalSection>

      <LegalSection title="10. Retention">
        <p>Active accounts: retained while active. Deleted accounts: purged within 30 days. Verification selfies: deleted within 90 days of approval or rejection. Payment receipts: kept 7 years for tax compliance.</p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>We notify you in-app and by email of material changes. Continued use after changes constitutes acceptance.</p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>PathfinderTech, Inc. — Privacy team</p>
        <div className="mt-2"><MailActions subject="Privacy question" /></div>
      </LegalSection>
    </LegalShell>
  );
}
