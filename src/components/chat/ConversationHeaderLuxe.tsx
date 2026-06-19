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
 * Premium chat header — large veiled avatar with eye-orb, three-stat row.
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
    <header className="relative shrink-0 border-b border-[oklch(0.56_0.22_286/0.15)] bg-gradient-to-b from-[oklch(0.11_0.04_298)] to-[oklch(0.10_0.04_298/0.85)] px-3 pb-3 pt-3 backdrop-blur-2xl sm:px-4">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.7)] text-foreground/80 backdrop-blur-xl transition-colors hover:bg-[oklch(0.18_0.07_298/0.8)] lg:hidden"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Veiled avatar with eye orb */}
        <div className="relative shrink-0">
          <div className="relative h-[76px] w-[76px] rounded-full bg-gradient-to-br from-[oklch(0.65_0.20_328)] via-[oklch(0.61_0.22_304)] to-[oklch(0.56_0.22_286)] p-[2px] shadow-[0_0_28px_oklch(0.61_0.22_304/0.45)]">
            <div className="h-full w-full rounded-full bg-[oklch(0.075_0.018_295)] p-[2px]">
              <ProfileAvatar
                userId={peerId}
                name={peerName}
                discoveryMode={peerDiscoveryMode}
                avatarUrl={peerAvatarUrl}
                photoUrl={peerPhotoUrl}
                size={68}
                veiled={!veilLifted}
              />
            </div>
          </div>
          {isOnline && (
            <span className="absolute -top-0.5 right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_0_2px_oklch(0.075_0.018_295),0_0_12px_oklch(0.7_0.2_150/0.7)]" />
          )}
          {/* Eye orb (reveal state) */}
          {!veilLifted && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.56_0.22_286)] to-[oklch(0.61_0.22_304)] shadow-[0_0_16px_oklch(0.61_0.22_304/0.7)] ring-2 ring-[oklch(0.075_0.018_295)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </span>
          )}
        </div>

        {/* Name + status + stats */}
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate font-display text-[24px] font-semibold tracking-tight text-foreground">{peerName}</h1>
              {verified && <VerifiedBadge size="xs" />}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={onReport}
                aria-label="Report"
                className="grid h-9 w-9 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.6)] text-foreground/70 transition-colors hover:bg-[oklch(0.18_0.07_298/0.8)]"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onMenu}
                aria-label="More"
                className="grid h-9 w-9 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.6)] text-foreground/70 transition-colors hover:bg-[oklch(0.18_0.07_298/0.8)]"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-0.5 text-[13px] italic text-[oklch(0.78_0.12_328)]">
            {veilLifted ? "Reveal complete · keep getting to know each other" : "Veiled until you're compatible"}
          </p>

          {/* 3-stat row */}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[oklch(0.56_0.22_286/0.12)] pt-2.5">
            <Stat
              icon={<Sparkles className="h-3.5 w-3.5 text-[oklch(0.61_0.22_304)]" />}
              value={compatibility != null ? `${compatibility}%` : "—"}
              label="Compatibility"
            />
            <div className="border-x border-[oklch(0.56_0.22_286/0.12)]">
              <Stat
                icon={<MessageCircle className="h-3.5 w-3.5 text-[oklch(0.65_0.20_328)]" />}
                value={String(messagesRemaining)}
                label="Messages left"
              />
            </div>
            <Stat
              icon={<ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.80_0.14_68)]" />}
              value={verified ? "Verified" : "Pending"}
              label={verified ? "Authentic" : "Unverified"}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-1 text-center">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{value}</span>
      </div>
      <span className="mt-0.5 text-[10px] font-medium tracking-tight text-foreground/55">{label}</span>
    </div>
  );
}
