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
    <header className="relative shrink-0 border-b border-[oklch(0.56_0.22_286/0.12)] bg-[oklch(0.10_0.035_298/0.78)] px-3 pb-1.5 pt-1.5 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[oklch(0.56_0.22_286/0.2)] bg-[oklch(0.13_0.05_298/0.6)] text-foreground/80 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Compact veiled avatar */}
        <div className="relative shrink-0">
          <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-[oklch(0.65_0.20_328)] via-[oklch(0.61_0.22_304)] to-[oklch(0.56_0.22_286)] p-[1.5px] shadow-[0_0_10px_oklch(0.61_0.22_304/0.25)]">
            <div className="h-full w-full rounded-full bg-[oklch(0.075_0.018_295)] p-[1px]">
              <ProfileAvatar
                userId={peerId}
                name={peerName}
                discoveryMode={peerDiscoveryMode}
                avatarUrl={peerAvatarUrl}
                photoUrl={peerPhotoUrl}
                size={32}
                veiled={!veilLifted}
              />
            </div>
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[oklch(0.10_0.035_298)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight text-foreground">{peerName}</h1>
            {verified && (
              <span className="relative inline-flex items-center justify-center rounded-full bg-[#39FF14] p-[2px] shadow-[0_0_6px_1.5px_rgba(57,255,20,0.7)]">
                <ShieldCheck className="h-2.5 w-2.5 text-[#0a0a0a]" strokeWidth={3} />
              </span>
            )}
            {veilLifted && (
              <span className="ml-0.5 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[oklch(0.78_0.10_328)]">
                · Reveal complete
              </span>
            )}
          </div>
          {/* Inline mini-stats: Match · Left · ID — replaces the separate strip */}
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] leading-tight text-foreground/70">
            <span className="inline-flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5 text-[oklch(0.61_0.22_304)]" />
              <span className="font-semibold text-foreground">{compatibility != null ? `${compatibility}%` : "—"}</span>
            </span>
            <span className="text-foreground/25">·</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-2.5 w-2.5 text-[oklch(0.65_0.20_328)]" />
              <span className="font-semibold text-foreground">{messagesRemaining}</span>
              <span className="text-foreground/50">left</span>
            </span>
            <span className="text-foreground/25">·</span>
            <span className="inline-flex items-center gap-0.5">
              <ShieldCheck
                className={`h-2.5 w-2.5 ${verified ? "text-[#39FF14]" : "text-foreground/35"}`}
                strokeWidth={verified ? 2.5 : 2}
              />
              <span className={verified ? "text-foreground" : "text-foreground/50"}>{verified ? "ID" : "ID?"}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onReport}
            aria-label="Report"
            className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMenu}
            aria-label="More"
            className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

