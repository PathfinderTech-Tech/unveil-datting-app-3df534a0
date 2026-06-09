import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  mediaPath: string;
  duration: number | null;
  mine: boolean;
};

/**
 * Voice-note chat bubble. Resolves a fresh signed URL on play,
 * then exposes play/pause + progress + duration in a rounded pill.
 */
export function VoiceMessageBubble({ mediaPath, duration, mine }: Props) {
  const [loading, setLoading] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [actualDur, setActualDur] = useState<number | null>(duration ?? null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function ensureSrc(): Promise<string | null> {
    if (src) return src;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("voice-messages")
        .createSignedUrl(mediaPath, 60 * 60);
      if (error) throw error;
      setSrc(data.signedUrl);
      return data.signedUrl;
    } catch (e) {
      console.error("voice-note signed url failed", e);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const url = await ensureSrc();
    if (!url) return;
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    try { await a.play(); setPlaying(true); } catch { /* ignore */ }
  }

  function onTime() {
    const a = audioRef.current; if (!a || !a.duration || !isFinite(a.duration)) return;
    setProgress(a.currentTime / a.duration);
  }
  function onLoaded() {
    const a = audioRef.current; if (!a) return;
    if (isFinite(a.duration)) setActualDur(Math.round(a.duration));
  }

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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          mine ? "bg-white/20 text-primary-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      </button>

      <div className="flex-1">
        {/* progress bar */}
        <div className={`h-1.5 overflow-hidden rounded-full ${mine ? "bg-white/25" : "bg-border/60"}`}>
          <div
            className={`h-full rounded-full transition-all ${mine ? "bg-white" : "bg-gradient-hero"}`}
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </div>
        <div className={`mt-1 font-mono text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {mm}:{ss}
        </div>
      </div>

      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={onTime}
          onLoadedMetadata={onLoaded}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          preload="metadata"
        />
      )}
    </div>
  );
}
