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
    <div className="max-w-[78%] overflow-hidden rounded-[20px] border border-[oklch(0.56_0.22_286/0.22)] bg-[oklch(0.13_0.05_298/0.55)] p-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.58_0.16_328)] to-[oklch(0.50_0.16_286)] text-xl shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
          {meta.emoji}
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] font-mono uppercase tracking-[0.16em] text-foreground/55">
            {mine ? "You sent" : `${senderName} sent you`}
          </div>
          <div className="font-display text-[14px] font-semibold leading-tight">{meta.name}</div>
        </div>
      </div>
      {parsed.note && (
        <p className="mt-2 text-[13px] italic leading-snug text-foreground/85">
          “{parsed.note}”
        </p>
      )}
    </div>
  );
}
