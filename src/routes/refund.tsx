import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — UNVEIL" },
      { name: "description", content: "UNVEIL subscription billing, cancellation, renewal, and refund terms." },
      { property: "og:title", content: "Refund Policy — UNVEIL" },
      { property: "og:url", content: "https://unveil.best/refund" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/refund" }],
  }),
  component: Refund,
});

function Refund() {
  return (
    <LegalShell title="Refund Policy" updated="June 2026">
      <p>
        UNVEIL is operated by PathfinderTech, Inc. ("UNVEIL"). All payments are
        processed by Stripe, Inc. This policy explains how subscription billing,
        cancellations, renewals, and refunds work.
      </p>

      <LegalSection title="1. Subscription billing terms">
        <p>
          UNVEIL offers paid subscriptions (UNVEIL+, UNVEIL Black) on 1-, 3-, 6-,
          and 12-month plans. The price, currency, and billing interval are
          displayed before purchase and on your Stripe receipt. Taxes are added
          where required by law.
        </p>
      </LegalSection>

      <LegalSection title="2. Automatic renewal">
        <p>
          Subscriptions automatically renew at the end of each billing period at
          the then-current price for the same plan length, unless cancelled at
          least 24 hours before renewal. You will receive a renewal receipt by
          email each time we charge your payment method.
        </p>
      </LegalSection>

      <LegalSection title="3. How to cancel">
        <p>
          You can cancel anytime from <strong>Settings → Manage Subscription</strong>,
          which opens the Stripe customer portal. Cancellation takes effect at
          the end of the current paid period — you keep premium access until
          then. After cancellation, your account reverts to the free tier; your
          profile, matches, and messages remain intact.
        </p>
        <p>
          If you subscribed through Apple App Store or Google Play, you must
          cancel through that store's subscription settings. UNVEIL cannot
          process refunds for App Store or Play Store purchases — contact Apple
          or Google directly.
        </p>
      </LegalSection>

      <LegalSection title="4. Refund eligibility">
        <p>For Stripe-processed payments made directly on unveil.best:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Refund requests within 14 days of the initial purchase of a new plan are honored in full, provided premium features have not been substantially used.</li>
          <li>Renewals are non-refundable after 48 hours, except where required by local consumer-protection law (see Section 6).</li>
          <li>We do not pro-rate refunds for unused time when you cancel mid-period.</li>
          <li>Accounts terminated for violation of our Terms or Community Guidelines are not eligible for refunds.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How to request a refund">
        <p>Email <a className="text-accent underline" href="mailto:support@unveil.best">support@unveil.best</a> from the email address on your account. Include your Stripe receipt ID. We respond within 5 business days. Approved refunds are returned to the original payment method within 5–10 business days.</p>
        <div className="mt-2"><MailActions subject="Refund request" /></div>
      </LegalSection>

      <LegalSection title="6. Consumer protection (EU / UK / California)">
        <p>
          EU and UK consumers have a 14-day statutory right of withdrawal under
          the Consumer Rights Directive. California residents may have
          additional rights under California Civil Code § 1789.3. None of these
          rights are reduced by this policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Failed payments">
        <p>If a renewal payment fails, Stripe will retry up to 3 times. If still unpaid, your premium features pause until you update your payment method in the customer portal.</p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>PathfinderTech, Inc. · <a className="text-accent underline" href="https://unveil.best">unveil.best</a></p>
        <div className="mt-2"><MailActions subject="Billing question" /></div>
      </LegalSection>
    </LegalShell>
  );
}
