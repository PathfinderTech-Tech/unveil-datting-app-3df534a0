import { ChevronLeft, Flag, MoreVertical, Sparkles, MessageCircle, ShieldCheck } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type Props = {
  peerId: string;
  peerName: string;
  peerAvatarUrl?: string | null;
  peerPhotoUrl?: string | null;
  peerDiscoveryMode?: "avatar" | "photo" | null;
  verified: boolean;
  isOnline: boolean;
  veilLifted: boolean;
  compatibility: number | null;
  messagesRemaining: number;
  onBack: () => void;
  onReport: () => void;
  onMenu: () => void;
};

/**
 * Compact luxury chat header — readable on iPhone SE → 16, restrained glow.
 */
export function ConversationHeaderLuxe({
  peerId,
  peerName,
  peerAvatarUrl,
  peerPhotoUrl,
  peerDiscoveryMode,
  verified,
  isOnline,
  veilLifted,
  compatibility,
  messagesRemaining,
  onBack,
  onReport,
  onMenu,
}: Props) {
  return (
    <header className="relative shrink-0 border-b border-[oklch(0.56_0.22_286/0.12)] bg-[oklch(0.10_0.035_298/0.78)] px-3 pb-2.5 pt-2 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.6)] text-foreground/80 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Compact veiled avatar */}
        <div className="relative shrink-0">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-[oklch(0.65_0.20_328)] via-[oklch(0.61_0.22_304)] to-[oklch(0.56_0.22_286)] p-[1.5px] shadow-[0_0_14px_oklch(0.61_0.22_304/0.28)]">
            <div className="h-full w-full rounded-full bg-[oklch(0.075_0.018_295)] p-[1.5px]">
              <ProfileAvatar
                userId={peerId}
                name={peerName}
                discoveryMode={peerDiscoveryMode}
                avatarUrl={peerAvatarUrl}
                photoUrl={peerPhotoUrl}
                size={42}
                veiled={!veilLifted}
              />
            </div>
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[oklch(0.10_0.035_298)]" />
          )}
        </div>

        {/* Name + subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate font-display text-[17px] font-semibold leading-tight tracking-tight text-foreground">{peerName}</h1>
            {verified && <VerifiedBadge size="xs" />}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] leading-tight text-[oklch(0.78_0.10_328)]">
            {veilLifted ? "Reveal complete" : "Veiled · keep talking to reveal"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onReport}
            aria-label="Report"
            className="grid h-9 w-9 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.5)] text-foreground/70 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMenu}
            aria-label="More"
            className="grid h-9 w-9 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.5)] text-foreground/70 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Slim 3-stat strip */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-2xl border border-[oklch(0.56_0.22_286/0.1)] bg-[oklch(0.13_0.05_298/0.4)] px-1 py-1.5">
        <Stat
          icon={<Sparkles className="h-3 w-3 text-[oklch(0.61_0.22_304)]" />}
          value={compatibility != null ? `${compatibility}%` : "—"}
          label="Match"
        />
        <div className="border-x border-[oklch(0.56_0.22_286/0.1)]">
          <Stat
            icon={<MessageCircle className="h-3 w-3 text-[oklch(0.65_0.20_328)]" />}
            value={String(messagesRemaining)}
            label="Left today"
          />
        </div>
        <Stat
          icon={<ShieldCheck className="h-3 w-3 text-[oklch(0.80_0.14_68)]" />}
          value={verified ? "Verified" : "Pending"}
          label="ID"
        />
      </div>
    </header>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-1 text-center">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[12.5px] font-semibold tracking-tight text-foreground">{value}</span>
      </div>
      <span className="text-[9.5px] font-medium tracking-tight text-foreground/55">{label}</span>
    </div>
  );
}
