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
 * Floating premium action bar above the message composer.
 *
 * 4 large gradient icons: Voice Note, Send Gift, AI Insights, Date Ideas.
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
    { id: "voice", label: "Voice Note", onClick: onVoice, badge: voiceBadge, disabled },
    { id: "gift", label: "Send Gift", onClick: onGift, badge: giftBadge, disabled },
    { id: "ai", label: "AI Insights", onClick: onAi, badge: aiBadge, disabled },
    { id: "date", label: "Date Ideas", onClick: onDate, badge: dateBadge, disabled },
  ];

  return (
    <div className="mx-3 mb-2 overflow-hidden rounded-3xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.55)] p-2.5 backdrop-blur-2xl shadow-[0_8px_30px_-12px_oklch(0.075_0.018_295/0.6)]">
      <div className="grid grid-cols-4 gap-1">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 transition-all hover:bg-[oklch(0.18_0.07_298/0.55)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className={`relative grid h-12 w-12 place-items-center rounded-2xl ${tileBg(a.id)} shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_6px_20px_-8px_oklch(0.075_0.018_295/0.6)] transition-transform group-hover:scale-105`}>
              {iconFor(a.id)}
              {a.badge && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.20_328)] ring-2 ring-[oklch(0.13_0.05_298)]" />
              )}
            </span>
            <span className="text-[10px] font-medium tracking-tight text-foreground/80">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function tileBg(id: Action["id"]): string {
  switch (id) {
    case "voice":
      return "bg-gradient-to-br from-[oklch(0.56_0.22_286)] to-[oklch(0.61_0.22_304)]";
    case "gift":
      return "bg-gradient-to-br from-[oklch(0.65_0.20_328)] to-[oklch(0.72_0.14_346)]";
    case "ai":
      return "bg-gradient-to-br from-[oklch(0.80_0.14_68)] to-[oklch(0.70_0.14_48)]";
    case "date":
      return "bg-gradient-to-br from-[oklch(0.55_0.18_240)] to-[oklch(0.45_0.18_265)]";
  }
}

function iconFor(id: Action["id"]) {
  const cls = "h-5 w-5 text-white drop-shadow-[0_1px_2px_oklch(0_0_0/0.4)]";
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
