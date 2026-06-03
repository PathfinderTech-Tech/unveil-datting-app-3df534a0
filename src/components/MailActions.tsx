// Universal email actions — opens the visitor's default email app via mailto.
// No webmail redirects (Gmail/Outlook/Superhuman websites are never opened).
import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";

export const SUPPORT_EMAIL = "support@unveil.best";
export const DEFAULT_SUPPORT_SUBJECT = "UNVEIL Support Request";

export function mailtoUrl(to: string, subject = DEFAULT_SUPPORT_SUBJECT, body = "") {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${to}${qs ? `?${qs}` : ""}`;
}

export function MailActions({
  email = SUPPORT_EMAIL,
  subject = DEFAULT_SUPPORT_SUBJECT,
  body = "",
  className = "",
}: { email?: string; subject?: string; body?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <a
        href={mailtoUrl(email, subject, body)}
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] hover:bg-surface-2"
        aria-label="Copy email address"
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={mailtoUrl(email, subject, body)}
        className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-2.5 py-1 text-[11px] text-primary-foreground shadow-glow"
      >
        <Mail className="h-3 w-3" /> Email us
      </a>
    </span>
  );
}
