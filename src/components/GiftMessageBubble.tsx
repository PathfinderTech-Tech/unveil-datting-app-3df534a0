import { parseGiftMessage } from "@/lib/gifts.functions";

const GIFT_META: Record<string, { name: string; emoji: string }> = {
  rose: { name: "Rose", emoji: "🌹" },
  coffee: { name: "Coffee", emoji: "☕" },
  spark: { name: "Spark", emoji: "✨" },
  heart_note: { name: "Heart Note", emoji: "💌" },
  teddy_bear: { name: "Teddy Bear", emoji: "🧸" },
  scented_candle: { name: "Scented Candle", emoji: "🕯️" },
  love_letter: { name: "Love Letter", emoji: "💝" },
  bouquet: { name: "Bouquet", emoji: "💐" },
  champagne: { name: "Champagne", emoji: "🥂" },
};

export function GiftMessageBubble({
  content,
  mine,
  senderName,
}: {
  content: string;
  mine: boolean;
  senderName: string;
}) {
  const parsed = parseGiftMessage(content);
  const meta = parsed ? GIFT_META[parsed.slug] ?? { name: parsed.slug, emoji: "🎁" } : null;
  if (!parsed || !meta) {
    return <div className="text-sm">{content}</div>;
  }
  return (
    <div className="max-w-[78%] overflow-hidden rounded-[22px] border border-primary/40 bg-gradient-to-br from-primary/15 via-surface/80 to-accent/15 p-4 shadow-glow backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 text-2xl shadow-glow">
          {meta.emoji}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-luxury text-muted-foreground">
            {mine ? "You sent" : `${senderName} sent you`}
          </div>
          <div className="font-display text-base font-semibold">{meta.name}</div>
        </div>
      </div>
      {parsed.note && (
        <p className="mt-3 text-sm italic leading-relaxed text-foreground/90">
          “{parsed.note}”
        </p>
      )}
    </div>
  );
}
