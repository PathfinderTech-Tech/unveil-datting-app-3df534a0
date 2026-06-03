// Universal email actions — never opens a desktop mail client like Superhuman.
// Renders the support address with a Copy button and a Gmail compose link.
import { useState } from "react";
import { Copy, Check, Mail, ExternalLink } from "lucide-react";

export const SUPPORT_EMAIL = "support@unveil.best";

export function gmailComposeUrl(to: string, subject = "", body = "") {
  const params = new URLSearchParams({ view: "cm", fs: "1", to });
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function MailActions({
  email = SUPPORT_EMAIL,
  subject = "",
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
      <span className="font-medium text-foreground">{email}</span>
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
        href={gmailComposeUrl(email, subject, body)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-2.5 py-1 text-[11px] text-primary-foreground shadow-glow"
      >
        <Mail className="h-3 w-3" /> Gmail <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}
