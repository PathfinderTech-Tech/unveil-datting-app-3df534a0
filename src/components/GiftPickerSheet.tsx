import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Lock, Crown, X, Loader2 } from "lucide-react";
import {
  listGiftCatalog,
  getGiftQuota,
  sendGift,
  giftErrorMessage,
  type GiftCatalogItem,
  type GiftQuota,
} from "@/lib/gifts.functions";

export function GiftPickerSheet({
  open,
  onClose,
  peerId,
  peerName,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  peerId: string;
  peerName: string;
  onSent?: () => void;
}) {
  const listFn = useServerFn(listGiftCatalog);
  const quotaFn = useServerFn(getGiftQuota);
  const sendFn = useServerFn(sendGift);

  const [items, setItems] = useState<GiftCatalogItem[]>([]);
  const [quota, setQuota] = useState<GiftQuota | null>(null);
  const [selected, setSelected] = useState<GiftCatalogItem | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    Promise.all([listFn({ data: { peerId } }), quotaFn()])
      .then(([cat, q]) => {
        setItems(cat.items);
        setQuota(q);
      })
      .catch((e) => {
        console.error("[gifts] load failed", e);
        setError("Could not load gifts. Try again.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, peerId]);

  const quotaExhausted = !!quota && !quota.unlimited && quota.used >= quota.limit;

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await sendFn({ data: { peerId, slug: selected.slug, note: note.trim() } });
      if ("error" in res) {
        setError(giftErrorMessage(res.error));
      } else {
        onSent?.();
        onClose();
      }
    } catch (e) {
      console.error("[gifts] send failed", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-base font-semibold">Send a gift</div>
              <div className="text-[11px] text-muted-foreground">to {peerName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border/60 bg-surface/60 p-1.5 hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: "60vh" }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {quotaExhausted && (
                <div className="mb-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-accent/15 p-4 text-sm">
                  <div className="mb-2 font-semibold">Upgrade to Premium to send more meaningful gifts.</div>
                  <Link
                    to="/premium"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"
                  >
                    <Crown className="h-3.5 w-3.5" /> Upgrade to Premium
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((g) => {
                  const disabled = g.locked || (quotaExhausted && !selected);
                  const isSel = selected?.slug === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelected(g);
                        setNote(g.defaultMessage);
                        setError(null);
                      }}
                      title={g.locked ? g.lockReason ?? "Locked" : g.name}
                      className={`group relative flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all ${
                        isSel
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border bg-surface/40 hover:border-primary/40"
                      } ${disabled ? "opacity-50" : ""}`}
                    >
                      <div className="text-3xl">{g.emoji}</div>
                      <div className="text-[11px] font-medium leading-tight">{g.name}</div>
                      <div className="text-[10px] text-muted-foreground">💎 {g.gemCost}</div>
                      {g.locked && (
                        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="mt-5 space-y-3">
                  <label className="block text-[11px] font-mono uppercase tracking-luxury text-muted-foreground">
                    Add a note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 140))}
                    rows={3}
                    placeholder={selected.defaultMessage}
                    className="w-full resize-none rounded-2xl border border-border bg-surface/60 p-3 text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">{note.length}/140</div>
                </div>
              )}

              {selected?.locked && selected.lockReason && (
                <div className="mt-3 rounded-xl border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
                  {selected.lockReason}
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-surface/40 px-5 py-3">
          <div className="text-[11px] text-muted-foreground">
            {quota?.unlimited
              ? "Unlimited gifts (Premium)"
              : quota
              ? `${quota.used} / ${quota.limit} gifts this week`
              : ""}
          </div>
          <button
            onClick={handleSend}
            disabled={!selected || sending || selected.locked || quotaExhausted}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Send Gift
          </button>
        </div>
      </div>
    </div>
  );
}
