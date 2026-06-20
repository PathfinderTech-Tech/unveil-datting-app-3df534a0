import { Mic, Gift, Sparkles, Calendar } from "lucide-react";

type Action = {
  id: "voice" | "gift" | "ai" | "date";
  label: string;
  badge?: boolean;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  onVoice: () => void;
  onGift: () => void;
  onAi: () => void;
  onDate: () => void;
  voiceBadge?: boolean;
  giftBadge?: boolean;
  aiBadge?: boolean;
  dateBadge?: boolean;
  disabled?: boolean;
};

/**
 * Compact quick-action bar above the composer — smaller tiles, softer gradients.
 */
export function QuickActionBar({
  onVoice,
  onGift,
  onAi,
  onDate,
  voiceBadge,
  giftBadge,
  aiBadge,
  dateBadge,
  disabled,
}: Props) {
  const actions: Action[] = [
    { id: "voice", label: "Voice", onClick: onVoice, badge: voiceBadge, disabled },
    { id: "gift", label: "Gift", onClick: onGift, badge: giftBadge, disabled },
    { id: "ai", label: "AI", onClick: onAi, badge: aiBadge, disabled },
    { id: "date", label: "Date", onClick: onDate, badge: dateBadge, disabled },
  ];

  return (
    <div className="mx-3 mb-1.5 rounded-2xl border border-[oklch(0.56_0.22_286/0.1)] bg-[oklch(0.13_0.05_298/0.3)] px-1.5 py-1 backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-0.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className="group relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 transition-all hover:bg-[oklch(0.18_0.07_298/0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className={`relative grid h-8 w-8 place-items-center rounded-xl ${tileBg(a.id)} shadow-[inset_0_1px_0_oklch(1_0_0/0.07)]`}>
              {iconFor(a.id)}
              {a.badge && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[oklch(0.80_0.14_68)] ring-2 ring-[oklch(0.13_0.05_298)]" />
              )}
            </span>
            <span className="text-[9.5px] font-medium tracking-tight text-foreground/70">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function tileBg(id: Action["id"]): string {
  switch (id) {
    case "voice":
      return "bg-gradient-to-br from-[oklch(0.50_0.16_286)] to-[oklch(0.55_0.18_304)]";
    case "gift":
      return "bg-gradient-to-br from-[oklch(0.58_0.16_328)] to-[oklch(0.65_0.12_346)]";
    case "ai":
      return "bg-gradient-to-br from-[oklch(0.72_0.12_68)] to-[oklch(0.62_0.12_48)]";
    case "date":
      return "bg-gradient-to-br from-[oklch(0.48_0.14_240)] to-[oklch(0.40_0.14_265)]";
  }
}

function iconFor(id: Action["id"]) {
  const cls = "h-4 w-4 text-white";
  switch (id) {
    case "voice":
      return <Mic className={cls} />;
    case "gift":
      return <Gift className={cls} />;
    case "ai":
      return <Sparkles className={cls} />;
    case "date":
      return <Calendar className={cls} />;
  }
}
