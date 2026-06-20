import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  mediaPath: string;
  duration: number | null;
  mine: boolean;
};

/**
 * Module-level signed-URL cache so the same voice note doesn't re-sign
 * every time the bubble re-renders or the user scrolls past it. Signed
 * URLs are valid for 1h; we expire entries slightly earlier to be safe.
 */
const URL_CACHE = new Map<string, { url: string; expiresAt: number }>();
const SIGN_TTL_SEC = 60 * 60;
const SAFETY_WINDOW_MS = 60_000;

async function getSignedUrl(mediaPath: string): Promise<string | null> {
  const cached = URL_CACHE.get(mediaPath);
  if (cached && cached.expiresAt > Date.now() + SAFETY_WINDOW_MS) {
    return cached.url;
  }
  const { data, error } = await supabase.storage
    .from("voice-messages")
    .createSignedUrl(mediaPath, SIGN_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  URL_CACHE.set(mediaPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGN_TTL_SEC * 1000,
  });
  return data.signedUrl;
}

/**
 * Track the currently playing bubble so tapping a new note pauses the old
 * one (WhatsApp/iMessage behaviour).
 */
let CURRENT_AUDIO: HTMLAudioElement | null = null;
const STOP_LISTENERS = new Set<() => void>();

function stopAllOthers(except: HTMLAudioElement) {
  if (CURRENT_AUDIO && CURRENT_AUDIO !== except) {
    CURRENT_AUDIO.pause();
  }
  CURRENT_AUDIO = except;
  STOP_LISTENERS.forEach((fn) => fn());
}

/**
 * Voice-note chat bubble. Resolves & caches a signed URL eagerly on mount,
 * uses an imperatively-created Audio element so the very first tap starts
 * playback (no React render gap between fetch → mount → play), and shows
 * loading / playing / paused / completed states with a subtle animated bar.
 */
export function VoiceMessageBubble({ mediaPath, duration, mine }: Props) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [actualDur, setActualDur] = useState<number | null>(duration ?? null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  /** Build the <audio> element once we have a URL. Idempotent. */
  const ensureAudio = useCallback((url: string) => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    a.addEventListener("timeupdate", () => {
      if (a.duration && isFinite(a.duration)) {
        setProgress(a.currentTime / a.duration);
      }
    });
    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration)) setActualDur(Math.round(a.duration));
    });
    a.addEventListener("ended", () => {
      setPlaying(false);
      setCompleted(true);
      setProgress(1);
      if (CURRENT_AUDIO === a) CURRENT_AUDIO = null;
    });
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("play", () => {
      setPlaying(true);
      setCompleted(false);
    });
    audioRef.current = a;
    return a;
  }, []);

  // Eagerly resolve the signed URL on mount so the first tap can play
  // immediately. Also primes the browser's HTTP cache so playback starts
  // in well under a second on subsequent taps.
  useEffect(() => {
    let alive = true;
    (async () => {
      const url = await getSignedUrl(mediaPath);
      if (!alive || !url) return;
      urlRef.current = url;
      ensureAudio(url);
    })();

    // If another bubble starts playing, reflect "not playing" here.
    const onOtherPlay = () => {
      const a = audioRef.current;
      if (a && CURRENT_AUDIO !== a) setPlaying(false);
    };
    STOP_LISTENERS.add(onOtherPlay);

    return () => {
      alive = false;
      STOP_LISTENERS.delete(onOtherPlay);
      const a = audioRef.current;
      if (a) {
        a.pause();
        if (CURRENT_AUDIO === a) CURRENT_AUDIO = null;
      }
    };
  }, [mediaPath, ensureAudio]);

  const toggle = useCallback(() => {
    // CRITICAL: stay synchronous inside the click handler so mobile browsers
    // accept the play() as a user gesture. No `await` before .play().
    let a = audioRef.current;
    const cachedUrl = urlRef.current ?? URL_CACHE.get(mediaPath)?.url ?? null;

    if (a && cachedUrl) {
      if (!a.paused && !a.ended) {
        a.pause();
        return;
      }
      stopAllOthers(a);
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      return;
    }

    // Cold path: URL not signed yet. Sign, then attempt to play. The first
    // tap may show a brief loading spinner; subsequent taps are instant
    // because the URL + Audio element are cached.
    setLoading(true);
    (async () => {
      try {
        const url = cachedUrl ?? (await getSignedUrl(mediaPath));
        if (!url) return;
        urlRef.current = url;
        a = ensureAudio(url);
        stopAllOthers(a);
        const p = a.play();
        if (p && typeof p.catch === "function") await p.catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, [mediaPath, ensureAudio]);

  const dur = actualDur ?? duration ?? 0;
  const mm = String(Math.floor(dur / 60)).padStart(2, "0");
  const ss = String(dur % 60).padStart(2, "0");

  return (
    <div
      className={`flex items-center gap-3 rounded-[20px] px-3 py-2.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.25)] ${
        mine
          ? "rounded-br-md bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground"
          : "rounded-bl-md border border-border/50 bg-surface/70 text-foreground backdrop-blur-xl"
      }`}
      style={{ minWidth: 200, maxWidth: 280 }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
          mine ? "bg-white/20 text-primary-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
      </button>

      <div className="flex-1">
        {/* progress bar with subtle animated waveform overlay while playing */}
        <div className={`relative h-1.5 overflow-hidden rounded-full ${mine ? "bg-white/25" : "bg-border/60"}`}>
          <div
            className={`h-full rounded-full transition-all ${mine ? "bg-white" : "bg-gradient-hero"}`}
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
          {playing && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 animate-pulse ${
                mine ? "bg-white/15" : "bg-primary/15"
              }`}
            />
          )}
        </div>
        <div className={`mt-1 flex items-center justify-between font-mono text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          <span>{mm}:{ss}</span>
          {completed && !playing && <span>played</span>}
        </div>
      </div>
    </div>
  );
}
