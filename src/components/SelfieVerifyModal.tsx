import { Camera, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { markSelfieVerified } from "@/lib/verification.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  onVerified?: () => void;
};

type Phase = "intro" | "live" | "review" | "saving" | "done";

export function SelfieVerifyModal({ open, onClose, returnTo, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [canCapture, setCanCapture] = useState(false);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase("intro");
      setSnapshot(null);
      setError(null);
      setCanCapture(false);
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Attach stream to video element whenever both are ready.
  useEffect(() => {
    if (phase !== "live") return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    try {
      if (v.srcObject !== s) v.srcObject = s;
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.muted = true;
      v.autoplay = true;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [phase]);

  function stopCamera() {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
    }
    setCanCapture(false);
  }

  async function startCamera() {
    setError(null);
    setCanCapture(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not available on this device or browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("live");
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission denied. Enable camera access in your browser settings and try again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No front-facing camera found on this device.");
      } else if (name === "NotReadableError") {
        setError("Your camera is being used by another app. Close it and try again.");
      } else {
        setError("Couldn't start the camera. Please try again.");
      }
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSnapshot(dataUrl);
    stopCamera();
    setPhase("review");
  }

  async function confirm() {
    if (!snapshot) return;
    setPhase("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in.");
      const blob = await (await fetch(snapshot)).blob();
      const path = `${user.id}/selfies/verify-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      await markSelfieVerified();
      setPhase("done");
      toast.success("Thank you for helping keep the Unveil community safe.");
      onVerified?.();
      setTimeout(() => {
        onClose();
        const dest = returnTo ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : null);
        if (dest && typeof window !== "undefined") window.location.href = dest;
      }, 1200);
    } catch (e: any) {
      console.error("[unveil] selfie verify failed", e);
      toast.error(e?.message ?? "Could not save selfie.");
      setPhase("review");
    }
  }

  function retake() {
    setSnapshot(null);
    void startCamera();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-glow">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/60 p-1.5 text-muted-foreground hover:bg-surface"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === "intro" && (
          <div className="px-6 pb-6 pt-7 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-light">
              Keep the <span className="text-gradient-aura italic">conversation going</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Verify it's really you. Take a quick selfie to confirm your profile photos.
              It's free, takes under a minute, and keeps UNVEIL safe for everyone.
            </p>
            {error && (
              <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="mt-5 grid gap-2">
              <button
                onClick={startCamera}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <Camera className="h-4 w-4" /> Take Selfie
              </button>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="rounded-full py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {phase === "live" && (
          <div className="flex flex-col">
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                disablePictureInPicture
                onLoadedMetadata={() => setCanCapture(true)}
                onCanPlay={() => setCanCapture(true)}
                onError={() => setError("Camera preview failed to load. Please retry.")}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-white/40" />
              {!canCapture && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                </div>
              )}
            </div>
            <div className="grid gap-2 p-5">
              {error ? (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive">
                  {error}
                </p>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Center your face in the circle, then tap Capture.
                </p>
              )}
              <button
                onClick={capture}
                disabled={!canCapture}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Capture
              </button>
              <button
                onClick={() => { stopCamera(); setPhase("intro"); }}
                className="rounded-full py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {phase === "review" && snapshot && (
          <div className="flex flex-col">
            <div className="aspect-square w-full bg-black">
              <img src={snapshot} alt="Selfie preview" className="h-full w-full object-cover" />
            </div>
            <div className="grid gap-2 p-5">
              <p className="text-center text-xs text-muted-foreground">
                Looks good? This selfie stays private.
              </p>
              <button
                onClick={confirm}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <ShieldCheck className="h-4 w-4" /> Use this selfie
              </button>
              <button
                onClick={retake}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border py-2 text-xs text-muted-foreground hover:bg-surface"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retake
              </button>
            </div>
          </div>
        )}

        {(phase === "saving" || phase === "done") && (
          <div className="px-6 pb-8 pt-10 text-center">
            {phase === "saving" ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">Saving your selfie…</p>
              </>
            ) : (
              <>
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl">You're verified ✓</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you for helping keep the Unveil community safe.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
