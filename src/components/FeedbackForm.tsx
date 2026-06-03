import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageSquare } from "lucide-react";

type Kind = "bug" | "feature" | "general";

export function FeedbackForm() {
  const [kind, setKind] = useState<Kind>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) return toast.error("Please add a bit more detail.");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      kind, subject: subject.trim() || null, message: message.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — your feedback was sent.");
    setSubject(""); setMessage("");
  }

  const opts: Array<{ id: Kind; label: string; icon: React.ReactNode }> = [
    { id: "bug", label: "Report bug", icon: <Bug className="h-3.5 w-3.5" /> },
    { id: "feature", label: "Suggest feature", icon: <Lightbulb className="h-3.5 w-3.5" /> },
    { id: "general", label: "General", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl">Send feedback</h2>
      <p className="mt-1 text-xs text-muted-foreground">Help shape UNVEIL during the private beta.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button key={o.id} type="button" onClick={() => setKind(o.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                kind === o.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}>
              {o.icon} {o.label}
            </button>
          ))}
        </div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
          placeholder="Subject (optional)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary" />
        <textarea required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5}
          placeholder="Tell us what's going on…"
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
        <button disabled={busy} className="rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50">
          {busy ? "Sending…" : "Send feedback"}
        </button>
      </form>
    </div>
  );
}
