import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";

export type ReportCategory =
  | "fake_profile"
  | "harassment"
  | "scam"
  | "inappropriate_content"
  | "underage"
  | "other";

const CATEGORIES: { value: ReportCategory; label: string; hint: string }[] = [
  { value: "fake_profile", label: "Fake profile", hint: "Catfishing, stolen photos, AI-generated identity" },
  { value: "harassment", label: "Harassment", hint: "Threats, hate speech, stalking" },
  { value: "scam", label: "Scam", hint: "Asking for money, gift cards, crypto, investments" },
  { value: "inappropriate_content", label: "Inappropriate content", hint: "Nudity, sexual content, violence" },
  { value: "underage", label: "Underage user", hint: "Person appears to be under 18" },
  { value: "other", label: "Other", hint: "Tell us what's wrong" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  /** Optional — auto-block after report. */
  onBlockToo?: () => Promise<void> | void;
}

/**
 * Apple-compliant in-app reporting dialog.
 * Inserts into the existing `reports` table (no schema change).
 */
export function ReportUserDialog({ open, onClose, reportedUserId, onBlockToo }: Props) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [autoBlock, setAutoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!category) {
      toast.error("Choose a category");
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const reporterId = u.user?.id;
      if (!reporterId) throw new Error("Not signed in");
      const reason = `[${category}] ${details.trim()}`.slice(0, 2000);
      const { error } = await supabase
        .from("reports")
        .insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason });
      if (error) throw error;
      if (autoBlock && onBlockToo) await onBlockToo();
      toast.success("Report submitted. Our trust team reviews within 24 hours.");
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCategory(null);
    setDetails("");
    setAutoBlock(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            <h2 id="report-title" className="font-display text-xl">Report user</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Reports are confidential. The reported user will not see who reported them.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Report category</legend>
          {CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition ${
                category === c.value
                  ? "border-destructive bg-destructive/10"
                  : "border-border bg-surface/40 hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="report-category"
                value={c.value}
                checked={category === c.value}
                onChange={() => setCategory(c.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{c.label}</span>
                <span className="block text-xs text-muted-foreground">{c.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block">
          <span className="text-xs text-muted-foreground">Additional details (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What happened?"
            className="mt-1 w-full resize-none rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:border-destructive"
          />
        </label>

        {onBlockToo && (
          <label className="mt-3 flex items-center gap-2 text-xs text-foreground/85">
            <input
              type="checkbox"
              checked={autoBlock}
              onChange={(e) => setAutoBlock(e.target.checked)}
            />
            Also block this user so they can't contact me again
          </label>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !category}
            className="flex-1 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Immediate block — inserts into the `blocks` table.
 * Existing RLS policies hide the blocker's data from the blocked user.
 */
export async function blockUser(blockedUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const blockerId = u.user?.id;
  if (!blockerId) throw new Error("Not signed in");
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedUserId });
  if (error && !error.message.includes("duplicate")) throw error;
}
