import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Your UNVEIL Account" },
      { name: "description", content: "Request permanent deletion of your UNVEIL account and personal data." },
      { property: "og:title", content: "Delete Your UNVEIL Account" },
      { property: "og:url", content: "https://unveil.best/delete-account" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/delete-account" }],
  }),
  component: DeleteAccount,
});

function DeleteAccount() {
  return (
    <LegalShell title="Delete Your UNVEIL Account">
      <p>
        If you wish to permanently delete your UNVEIL account and associated
        personal data, please email us at{" "}
        <a className="text-accent underline" href="mailto:support@unveil.best">support@unveil.best</a>{" "}
        with the subject line <strong>Delete My Account</strong>.
      </p>

      <div className="my-6 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Email subject</p>
        <p className="font-display text-lg font-light">Delete My Account</p>
        <div className="mt-3">
          <a
            href="mailto:support@unveil.best?subject=Delete%20My%20Account"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Mail className="h-4 w-4" /> Email Support
          </a>
        </div>
      </div>

      <LegalSection title="Please include">
        <ul className="ml-5 list-disc space-y-1">
          <li>Your registered email address or phone number</li>
          <li>Your display name (if known)</li>
        </ul>
      </LegalSection>

      <LegalSection title="Processing time">
        <p>
          We will process verified deletion requests within 30 days, except
          where we are legally required to retain certain information.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>PathfinderTech, Inc. — UNVEIL Support</p>
        <div className="mt-2">
          <MailActions subject="Delete My Account" />
        </div>
      </LegalSection>
    </LegalShell>
  );
}
