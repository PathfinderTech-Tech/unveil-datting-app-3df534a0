import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, LegalSection } from "@/components/LegalShell";
import { MailActions } from "@/components/MailActions";
import { Shield, Mail } from "lucide-react";

export const Route = createFileRoute("/child-safety")({
  head: () => ({
    meta: [
      { title: "UNVEIL Child Safety Standards" },
      { name: "description", content: "UNVEIL's child safety standards, zero-tolerance policy, and reporting procedures for protecting minors." },
      { property: "og:title", content: "UNVEIL Child Safety Standards" },
      { property: "og:description", content: "UNVEIL's child safety standards, zero-tolerance policy, and reporting procedures for protecting minors." },
      { property: "og:url", content: "https://unveil.best/child-safety" },
    ],
    links: [{ rel: "canonical", href: "https://unveil.best/child-safety" }],
  }),
  component: ChildSafety,
});

function ChildSafety() {
  return (
    <LegalShell title="UNVEIL Child Safety Standards" updated="June 2026">
      <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <Shield className="h-6 w-6 flex-shrink-0 text-accent" />
        <p className="text-sm font-medium text-foreground">
          Protecting Our Community
        </p>
      </div>

      <p>
        UNVEIL is committed to maintaining a safe environment and has zero tolerance for child sexual abuse and exploitation (CSAE).
      </p>

      <LegalSection title="Age Requirement">
        <p>
          UNVEIL is strictly for adults aged 18 years or older. Users under 18 are prohibited from creating or using an account.
        </p>
      </LegalSection>

      <LegalSection title="Zero-Tolerance Policy">
        <p>The following are strictly prohibited:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Child Sexual Abuse Material (CSAM)</li>
          <li>Grooming</li>
          <li>Sexual exploitation of minors</li>
          <li>Solicitation involving minors</li>
          <li>Any content that sexualizes or endangers children</li>
        </ul>
        <p>
          Violations result in immediate account suspension or permanent removal and may be reported to the appropriate authorities where required by law.
        </p>
      </LegalSection>

      <LegalSection title="Reporting">
        <p>Users can report:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Profiles</li>
          <li>Messages</li>
          <li>Images</li>
          <li>Voice notes</li>
          <li>Any behaviour involving child safety concerns</li>
        </ul>
        <p>Reports should be reviewed promptly by our moderation system.</p>
      </LegalSection>

      <LegalSection title="Moderation">
        <p>
          UNVEIL uses moderation processes to detect and remove harmful content and investigates all child safety reports as quickly as possible.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>For child safety concerns, contact:</p>
        <div className="my-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Email</p>
          <div className="mt-2">
            <MailActions email="developer@pathfindertech.tech" subject="Child Safety Concern" />
          </div>
          <div className="mt-4">
            <a
              href="mailto:developer@pathfindertech.tech?subject=Child%20Safety%20Concern"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
            >
              <Mail className="h-4 w-4" /> Email Child Safety Team
            </a>
          </div>
        </div>
      </LegalSection>
    </LegalShell>
  );
}
