import { useState } from "react";
import { X, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { sendThought } from "@/lib/thoughts-api";

type Props = {
  targetUserId: string;
  targetName?: string;
  onClose: () => void;
  onSent?: (result: { mutual: boolean; conversationId: string | null }) => void;
};

export function ThoughtModal({ targetUserId, targetName, onClose, onSent }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    const trimmed = text.trim();
    if (!trimmed) { toast.error("Write a short thought first."); return; }
    setSubmitting(true);
    const res = await sendThought(targetUserId, trimmed);
    setSubmitting(false);
    if (res.error) { toast.error(res.error); return; }
    if (res.mutual) {
      toast.success(`It's mutual${targetName ? ` with ${targetName}` : ""} — your thought opened a conversation.`);
    } else {
      toast.success("Thought delivered.");
    }
    onSent?.({ mutual: res.mutual, conversationId: res.conversationId });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 p-4 backdrop-blur-md md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border p-6 pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Send a thought</div>
            <h2 className="mt-1 font-display text-xl font-bold">
              {targetName ? `For ${targetName}` : "Share something honest"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A short note (up to 280 characters). Sending registers your interest. If it's mutual, it opens a conversation.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 pt-4">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            placeholder="One small thing I'd want you to know is…"
            rows={4}
            className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-1 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {text.length}/280
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-background/40 p-4">
          <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm hover:bg-surface">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-hero py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {submitting ? <MessageCircle className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending…" : "Send thought"}
          </button>
        </div>
      </div>
    </div>
  );
}
