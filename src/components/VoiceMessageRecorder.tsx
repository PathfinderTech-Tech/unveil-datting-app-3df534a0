import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Play, Pause, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  conversationId: string;
  senderId: string;
  /** Max recording length in seconds. */
  maxSeconds?: number;
  /** Fires after the row is inserted; chat realtime will pick it up. */
  onSent?: () => void;
  /** When daily quota is exhausted, parent shows paywall. */
  onQuotaExhausted?: () => void;
  /** Premium / quota-aware: if false, do not allow recording. */
  disabled?: boolean;
};

type Phase = "idle" | "recording" | "preview" | "uploading";

export function VoiceMessageRecorder({
  conversationId,
  senderId,
  maxSeconds = 60,
  onSent,
  onQuotaExhausted,
  disabled,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordedBlobRef = useRef<{ blob: Blob; mime: string; duration: number } | null>(null);

  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function cleanup() {
    tickRef.current && clearInterval(tickRef.current);
    try { mediaRef.current && mediaRef.current.state !== "inactive" && mediaRef.current.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  async function start() {
    if (disabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice notes aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const isSupported = (MediaRecorder as unknown as { isTypeSupported?: (m: string) => boolean }).isTypeSupported;
      const mime = candidates.find((m) => { try { return isSupported?.(m); } catch { return false; } });
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.start();
      mediaRef.current = mr;
      setSeconds(0);
      setPhase("recording");
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= maxSeconds) stop();
          return next;
        });
      }, 1000);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Microphone access is needed to send voice notes.");
      } else if (name === "NotFoundError") {
        toast.error("No microphone found.");
      } else {
        toast.error("Couldn't start recording.");
      }
    }
  }

  async function stop() {
    tickRef.current && clearInterval(tickRef.current);
    const mr = mediaRef.current;
    if (!mr) return;
    try {
      if (mr.state !== "inactive") {
        await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });
      }
    } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const mime = mr.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    if (blob.size === 0) {
      toast.error("Recording was empty — try again.");
      setPhase("idle");
      return;
    }
    const url = URL.createObjectURL(blob);
    recordedBlobRef.current = { blob, mime, duration: seconds };
    setPreviewUrl(url);
    setPhase("preview");
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    recordedBlobRef.current = null;
    setSeconds(0);
    setPhase("idle");
  }

  function togglePlay() {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => toast.error("Couldn't play audio.")); }
  }

  async function send() {
    const rec = recordedBlobRef.current;
    if (!rec) return;
    setPhase("uploading");
    try {
      const ext = rec.mime.includes("mp4") ? "m4a" : rec.mime.includes("ogg") ? "ogg" : "webm";
      const path = `${conversationId}/${senderId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("voice-messages").upload(path, rec.blob, {
        contentType: rec.mime, upsert: false,
      });
      if (upErr) throw upErr;

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: "🎤 Voice note",
        message_type: "voice",
        media_url: path,
        media_type: rec.mime,
        duration_seconds: rec.duration,
      } as never);
      if (msgErr) {
        // Roll back the upload best-effort
        await supabase.storage.from("voice-messages").remove([path]);
        if (msgErr.message?.includes("DAILY_MESSAGE_LIMIT_REACHED")) {
          onQuotaExhausted?.();
          toast.error("Daily limit reached.");
        } else {
          toast.error(msgErr.message);
        }
        setPhase("preview");
        return;
      }
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      toast.success("Voice note sent");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      recordedBlobRef.current = null;
      setSeconds(0);
      setPhase("idle");
      onSent?.();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to send voice note");
      setPhase("preview");
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // --- UI ---
  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        title="Record voice note"
        aria-label="Record voice note"
        className="shrink-0 rounded-full border border-border/60 bg-surface/70 p-2.5 backdrop-blur-xl transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mic className="h-4 w-4 text-accent" />
      </button>
    );
  }

  if (phase === "recording") {
    return (
      <div className="order-last flex w-full min-w-0 basis-full items-center gap-3 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 sm:order-none sm:w-auto sm:basis-auto sm:flex-1">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="font-mono text-sm text-foreground">{mm}:{ss}</span>
        <span className="text-xs text-muted-foreground">/ {String(Math.floor(maxSeconds/60)).padStart(2,"0")}:{String(maxSeconds%60).padStart(2,"0")}</span>
        <div className="flex-1" />
        <button
          onClick={cancel}
          className="shrink-0 rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Cancel recording"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={stop}
          className="shrink-0 rounded-full bg-gradient-hero p-2 text-primary-foreground shadow-glow"
          aria-label="Stop recording"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    );
  }

  // preview / uploading
  return (
    <div className="flex flex-1 items-center gap-3 rounded-full border border-primary/40 bg-primary/10 px-3 py-2">
      <button
        type="button"
        onClick={togglePlay}
        className="rounded-full bg-card p-2 text-primary"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      {previewUrl && <audio ref={audioRef} src={previewUrl} onEnded={() => setPlaying(false)} />}
      <span className="font-mono text-sm">{mm}:{ss}</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={cancel}
        disabled={phase === "uploading"}
        className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label="Delete and re-record"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={send}
        disabled={phase === "uploading"}
        className="rounded-full bg-gradient-hero p-2 text-primary-foreground shadow-glow disabled:opacity-50"
        aria-label="Send voice note"
      >
        {phase === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
