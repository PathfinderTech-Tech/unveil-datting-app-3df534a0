import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VoiceRow = { id: string; prompt: string; audio_url: string; duration_seconds: number | null };

export function VoiceRecorder({ userId, prompt }: { userId: string; prompt: string }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<VoiceRow | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.from("voice_prompts")
      .select("id, prompt, audio_url, duration_seconds")
      .eq("user_id", userId).eq("prompt", prompt)
      .order("created_at", { ascending: false }).limit(1)
      .then(async ({ data }) => {
        const row = data?.[0];
        if (!alive || !row) return;
        // audio_url stores the bucket path; create a signed url to play.
        const { data: signed } = await supabase.storage.from("voice-prompts").createSignedUrl(row.audio_url, 60 * 60);
        setExisting({ ...row, audio_url: signed?.signedUrl ?? "" });
      });
    return () => { alive = false; };
  }, [userId, prompt]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mr.start();
      mediaRef.current = mr;
      setSeconds(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => setSeconds((s) => {
        if (s >= 60) { stop(); return 60; }
        return s + 1;
      }), 1000);
    } catch {
      toast.error("Microphone permission denied.");
    }
  }

  async function stop() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const mr = mediaRef.current;
    if (!mr) return;
    setRecording(false);
    setBusy(true);
    await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const path = `${userId}/${Date.now()}.webm`;
    try {
      const { error } = await supabase.storage.from("voice-prompts").upload(path, blob, {
        contentType: "audio/webm", upsert: false,
      });
      if (error) throw error;
      const { data: row, error: insErr } = await supabase.from("voice_prompts").insert({
        user_id: userId, prompt, audio_url: path, duration_seconds: seconds,
      }).select("id, prompt, audio_url, duration_seconds").single();
      if (insErr) throw insErr;
      const { data: signed } = await supabase.storage.from("voice-prompts").createSignedUrl(path, 60 * 60);
      setExisting({ ...row, audio_url: signed?.signedUrl ?? "" });
      toast.success("Voice intro saved.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      // delete row + storage object (path was stored before signing)
      const { data: row } = await supabase.from("voice_prompts").select("audio_url").eq("id", existing.id).single();
      if (row?.audio_url) await supabase.storage.from("voice-prompts").remove([row.audio_url]);
      await supabase.from("voice_prompts").delete().eq("id", existing.id);
      setExisting(null);
    } finally { setBusy(false); }
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Voice prompt · up to 60s</div>
      <div className="mt-1 text-sm font-medium">{prompt}</div>

      {existing ? (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <audio ref={audioRef} src={existing.audio_url} onEnded={() => setPlaying(false)} />
          <span className="text-xs text-muted-foreground">{existing.duration_seconds ?? 0}s saved</span>
          <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface">
            <Trash2 className="h-3 w-3" /> Re-record
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          {!recording ? (
            <button onClick={start} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-sm text-primary-foreground shadow-glow disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Record
            </button>
          ) : (
            <button onClick={stop} className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground">
              <Square className="h-4 w-4" /> Stop ({seconds}s)
            </button>
          )}
          {recording && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
        </div>
      )}
    </div>
  );
}
