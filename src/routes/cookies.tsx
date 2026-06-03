import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — UNVEIL" },
      { name: "description", content: "How UNVEIL uses cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalShell title="Cookie Policy" updated="June 2026">
      <p>
        UNVEIL uses a minimal number of cookies and similar storage technologies to operate the
        product. We do not use third-party advertising cookies.
      </p>
      <LegalSection title="Strictly necessary">
        <p>Session cookies that keep you signed in and remember your language preference. These cannot be disabled without breaking the product.</p>
      </LegalSection>
      <LegalSection title="Functional">
        <p>Local storage entries used to remember onboarding progress, last-seen messages, and your preferred theme.</p>
      </LegalSection>
      <LegalSection title="Analytics">
        <p>Aggregate, privacy-respecting analytics to understand which features are used. No identifiers are sold or shared with third parties.</p>
      </LegalSection>
      <LegalSection title="Payments">
        <p>Stripe sets cookies during checkout to detect fraud. See Stripe's own cookie policy for details.</p>
      </LegalSection>
      <LegalSection title="Managing cookies">
        <p>You can clear cookies and local storage from your browser at any time. Doing so will sign you out and reset your in-app preferences.</p>
      </LegalSection>
    </LegalShell>
  );
}
