import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SignedImage } from "@/components/SignedImage";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayPhotoUrl } from "@/lib/photos";
import { toast } from "sonner";
import {
  Camera, Loader2, Upload, ArrowRight, ArrowLeft, Check,
  Sparkles, RefreshCw, Sun, Sliders, ShieldCheck, Wand2, X,
} from "lucide-react";

export const Route = createFileRoute("/avatar")({
  head: () => ({
    meta: [
      { title: "Photo Studio — UNVEIL" },
      { name: "description", content: "Polish your profile photo with subtle, natural enhancements." },
    ],
  }),
  component: PhotoStudioPage,
});

type Adjustments = {
  brightness: number; // 0.5 - 1.5 (1 = neutral)
  contrast: number;   // 0.5 - 1.5
  warmth: number;     // -30 - 30 (sepia-ish warm tint)
  smooth: number;     // 0 - 10 px blur
  saturation: number; // 0 - 2
};

const NEUTRAL: Adjustments = { brightness: 1, contrast: 1, warmth: 0, smooth: 0, saturation: 1 };

type Preset = { id: string; label: string; hint: string; adj: Adjustments };

const PRESETS: Preset[] = [
  { id: "original", label: "Original",   hint: "No filter",                     adj: { ...NEUTRAL } },
  { id: "natural",  label: "Natural",    hint: "Slight brightness & smoothing", adj: { brightness: 1.06, contrast: 1.03, warmth: 4,  smooth: 0.6, saturation: 1.02 } },
  { id: "glow",     label: "Glow",       hint: "Soft skin, warm tone",          adj: { brightness: 1.1,  contrast: 1.05, warmth: 12, smooth: 1.4, saturation: 1.08 } },
  { id: "confident",label: "Confident",  hint: "Sharper, better contrast",      adj: { brightness: 1.05, contrast: 1.18, warmth: 2,  smooth: 0.2, saturation: 1.1  } },
  { id: "elegant",  label: "Elegant",    hint: "Softer, premium portrait",      adj: { brightness: 1.04, contrast: 0.96, warmth: 8,  smooth: 1.0, saturation: 0.9  } },
  { id: "radiant",  label: "Radiant",    hint: "Bright & vibrant",              adj: { brightness: 1.14, contrast: 1.08, warmth: 10, smooth: 0.8, saturation: 1.2  } },
];

function PhotoStudioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceBlobUrl, setSourceBlobUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string>("natural");
  const [adj, setAdj] = useState<Adjustments>(PRESETS[1].adj);
  const [busy, setBusy] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancePhase, setEnhancePhase] = useState<"warming" | "enhancing">("warming");
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [preEnhanceUrl, setPreEnhanceUrl] = useState<string | null>(null);

  async function enhanceWithAI() {
    const src = sourceBlobUrl ?? sourceUrl;
    if (!src) { toast.error("Add a photo first."); return; }
    const FAIL_MSG = "AI Enhancement unavailable right now — try again in a moment.";
    setEnhancing(true);
    setEnhancePhase("warming");
    // Flip to "Enhancing your photo..." after 10s
    const phaseTimer = setTimeout(() => setEnhancePhase("enhancing"), 10_000);
    // Hard client-side timeout after 45s
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 45_000);
    try {
      // Convert current source to base64 (handles blob/http/signed URLs)
      const res = await fetch(src);
      const blob = await res.blob();
      if (blob.size > 8 * 1024 * 1024) throw new Error("Image too large (max 8MB)");
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Could not read image"));
        r.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("enhance-photo", {
        body: { image: dataUrl },
        // @ts-expect-error - supabase-js forwards signal to underlying fetch
        signal: controller.signal,
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          try {
            const j = await ctx.clone().json();
            if (j?.warming) { toast.info(j.message ?? "AI warming up, try again in 20 seconds"); return; }
          } catch { /* ignore */ }
        }
        toast.error(FAIL_MSG);
        return;
      }
      if (data?.warming) { toast.info(data.message ?? "AI warming up, try again in 20 seconds"); return; }
      if (!data?.image) { toast.error(FAIL_MSG); return; }
      setEnhancedUrl(data.image);
      toast.success("AI enhancement ready — compare and apply.");
    } catch {
      toast.error(FAIL_MSG);
    } finally {
      clearTimeout(phaseTimer);
      clearTimeout(abortTimer);
      setEnhancing(false);
    }
  }

  function applyEnhanced() {
    if (!enhancedUrl) return;
    setPreEnhanceUrl(sourceBlobUrl ?? sourceUrl);
    if (sourceBlobUrl) URL.revokeObjectURL(sourceBlobUrl);
    setSourceBlobUrl(enhancedUrl); // data: URL works as <img src> and canvas source
    setSourceUrl(enhancedUrl);
    setEnhancedUrl(null);
    toast.success("Using enhanced photo. Adjust filters and save.");
  }

  function revertEnhanced() {
    if (!preEnhanceUrl) return;
    setSourceBlobUrl(preEnhanceUrl.startsWith("data:") ? preEnhanceUrl : null);
    setSourceUrl(preEnhanceUrl);
    setPreEnhanceUrl(null);
    toast.message("Reverted to original photo.");
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("photo_url, profile_photo_url")
        .eq("id", user.id)
        .maybeSingle();
      const existing = data?.photo_url ?? data?.profile_photo_url ?? null;
      if (!existing) return;
      // Resolve to a signed URL since profile-photos bucket is private —
      // otherwise the <img> in the preview can't load it and the box stays empty.
      const signed = await getDisplayPhotoUrl(existing);
      if (signed) setSourceUrl(signed);
    })();
  }, [user]);

  function applyPreset(p: Preset) {
    setPresetId(p.id);
    setAdj(p.adj);
  }

  function patchAdj(patch: Partial<Adjustments>) {
    setAdj((a) => ({ ...a, ...patch }));
    setPresetId("custom");
  }

  async function uploadSelfie(file: File) {
    if (!user) { toast.error("Please sign in."); return; }
    if (!/^image\//.test(file.type)) { toast.error("Image files only."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB."); return; }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/selfie-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      setSourceUrl(pub.publicUrl);
      if (sourceBlobUrl) URL.revokeObjectURL(sourceBlobUrl);
      setSourceBlobUrl(URL.createObjectURL(file));
      setStep(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  async function saveEditedPhoto() {
    if (!user || !sourceUrl) { toast.error("Add a photo first."); return; }
    setBusy(true);
    try {
      // Render the current source image with adjustments onto a canvas.
      const img = await loadImage(sourceBlobUrl ?? sourceUrl);
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.filter = cssFilter(adj);
      ctx.drawImage(img, 0, 0, w, h);
      // Warm overlay (subtle multiply of warm color) — CSS filter sepia can
      // wash skin out, so we keep warmth as a soft tint here.
      if (adj.warmth !== 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.18, Math.abs(adj.warmth) / 100);
        ctx.fillStyle = adj.warmth > 0 ? "#ffb070" : "#7090ff";
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed"))), "image/jpeg", 0.92),
      );
      const path = `${user.id}/photo-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const url = pub.publicUrl;
      await supabase
        .from("profiles")
        .update({
          photo_url: url,
          profile_photo_url: url,
          avatar_url: url,
          avatar_style: "real",
          avatar_generated_at: new Date().toISOString(),
          discovery_mode: "photo",
        })
        .eq("id", user.id);
      setSavedUrl(url);
      setStep(2);
      toast.success("Profile photo saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  }

  const previewFilter = useMemo(() => cssFilter(adj), [adj]);
  const previewSrc = sourceBlobUrl ?? sourceUrl ?? null;

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Please <Link to="/login" className="text-primary underline">sign in</Link> to set your profile photo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <header className="text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl font-light md:text-5xl">
            <span className="text-gradient-aura italic">Photo</span> Studio
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Take or upload a real selfie, polish it with subtle filters, and use it across UNVEIL.
            Stays recognizable — no face swaps, no AI avatars.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Selfie Checked — basic authenticity for beta
          </div>
        </header>

        <div className="mt-8 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-hero" : "bg-surface-2"}`} />
          ))}
        </div>

        {/* STEP 0 — capture / upload */}
        {step === 0 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Step 1 of 3</div>
              <h2 className="mt-1 font-display text-2xl">Take a selfie or upload a photo</h2>
              <p className="mt-1 text-sm text-muted-foreground">Front-facing, good light, no sunglasses.</p>
            </div>

            <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3">
              <SelfieFrame url={sourceUrl} busy={busy} />
              <input
                ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSelfie(f); e.target.value = ""; }}
              />
              <button
                onClick={() => fileRef.current?.click()} disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {sourceUrl ? <><Upload className="h-3.5 w-3.5" /> Replace photo</> : <><Camera className="h-3.5 w-3.5" /> Take or upload photo</>}
              </button>
            </div>

            <Nav
              onBack={() => navigate({ to: "/onboarding" })}
              onSkip={() => navigate({ to: "/discover" })}
              onNext={() => { if (!sourceUrl) return toast.error("Add a photo to continue."); setStep(1); }}
            />
          </div>
        )}

        {/* STEP 1 — edit */}
        {step === 1 && previewSrc && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Step 2 of 3</div>
              <h2 className="mt-1 font-display text-2xl">Edit your photo</h2>
              <p className="mt-1 text-sm text-muted-foreground">Subtle, natural enhancements. Live preview.</p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
              {/* Live preview */}
              <div className="space-y-3">
                <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-glow">
                  <img
                    src={previewSrc}
                    alt="Preview"
                    className="h-full w-full object-cover transition-[filter] duration-150"
                    style={{ filter: previewFilter }}
                  />
                  {adj.warmth !== 0 && (
                    <div
                      className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                      style={{
                        backgroundColor: adj.warmth > 0 ? "#ffb070" : "#7090ff",
                        opacity: Math.min(0.18, Math.abs(adj.warmth) / 100),
                      }}
                    />
                  )}
                </div>
                <p className="text-center font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                  Live preview — saved photo will look exactly like this
                </p>
              </div>

              {/* Controls */}
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-luxury text-muted-foreground">
                    <Sun className="h-3.5 w-3.5" /> Filters
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => {
                      const sel = presetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p)}
                          className={`rounded-xl border px-2 py-2 text-left transition ${
                            sel ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:bg-surface-2"
                          }`}
                        >
                          <div className="font-display text-xs">{p.label}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2">{p.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-luxury text-muted-foreground">
                    <Sliders className="h-3.5 w-3.5" /> Fine tune
                  </div>
                  <div className="space-y-3">
                    <Slider label="Brightness"     min={0.5} max={1.5} step={0.01} value={adj.brightness} onChange={(v) => patchAdj({ brightness: v })} />
                    <Slider label="Contrast"       min={0.5} max={1.5} step={0.01} value={adj.contrast}   onChange={(v) => patchAdj({ contrast: v })} />
                    <Slider label="Warmth"         min={-30} max={30}  step={1}    value={adj.warmth}     onChange={(v) => patchAdj({ warmth: v })} />
                    <Slider label="Skin smoothing" min={0}   max={6}   step={0.1}  value={adj.smooth}     onChange={(v) => patchAdj({ smooth: v })} />
                    <Slider label="Saturation"     min={0}   max={2}   step={0.01} value={adj.saturation} onChange={(v) => patchAdj({ saturation: v })} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setAdj(NEUTRAL); setPresetId("original"); }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
                  >
                    <RefreshCw className="h-3 w-3" /> Reset
                  </button>
                  <button
                    onClick={enhanceWithAI}
                    disabled={enhancing}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60"
                    title="Use AI to gently retouch your photo"
                  >
                    {enhancing
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Enhancing…</>
                      : <><Wand2 className="h-3 w-3" /> Enhance with AI</>}
                  </button>
                  {preEnhanceUrl && (
                    <button
                      onClick={revertEnhanced}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
                    >
                      <X className="h-3 w-3" /> Revert AI
                    </button>
                  )}
                </div>

                {(enhancing || enhancedUrl) && (
                  <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-primary">
                      <Wand2 className="h-3 w-3" /> AI enhancement
                    </div>
                    {enhancing && !enhancedUrl && (
                      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Enhancing your photo… this can take 10–20s.
                      </div>
                    )}
                    {enhancedUrl && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
                            <div className="aspect-square w-full">
                              {previewSrc && (
                                <img src={previewSrc} alt="Before" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="px-2 py-1 text-center font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Before</div>
                          </div>
                          <div className="overflow-hidden rounded-xl border border-primary shadow-glow">
                            <div className="aspect-square w-full">
                              <img src={enhancedUrl} alt="After" className="h-full w-full object-cover" />
                            </div>
                            <div className="px-2 py-1 text-center font-mono text-[10px] uppercase tracking-luxury text-primary">After (AI)</div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={applyEnhanced}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-hero px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow"
                          >
                            <Check className="h-3.5 w-3.5" /> Use enhanced
                          </button>
                          <button
                            onClick={() => setEnhancedUrl(null)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:bg-surface-2"
                          >
                            <X className="h-3.5 w-3.5" /> Discard
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Nav
              onBack={() => setStep(0)}
              nextLabel={busy ? "Saving…" : "Save profile photo"}
              nextIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              onNext={saveEditedPhoto}
              disableNext={busy}
            />
          </div>
        )}

        {/* STEP 2 — done */}
        {step === 2 && (
          <div className="mt-8 rounded-3xl border border-primary bg-card p-6 shadow-glow md:p-8">
            <div className="text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-display text-2xl">Profile photo saved</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                It will appear on Discover, Matches, Messages, your Profile, Passport and share cards.
              </p>
            </div>

            <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-2">
              <Preview title="Original" url={sourceUrl} />
              <Preview title="Saved profile photo" url={savedUrl} highlight />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => navigate({ to: "/discover" })}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm hover:bg-surface-2">
                <ArrowLeft className="h-4 w-4" /> Keep editing
              </button>
              <button onClick={() => { setStep(0); setSavedUrl(null); }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm hover:bg-surface-2">
                <Camera className="h-4 w-4" /> New photo
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- helpers & subcomponents ---------- */

function cssFilter(a: Adjustments): string {
  return [
    `brightness(${a.brightness})`,
    `contrast(${a.contrast})`,
    `saturate(${a.saturation})`,
    a.smooth > 0 ? `blur(${(a.smooth * 0.35).toFixed(2)}px)` : "",
  ].filter(Boolean).join(" ");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function SelfieFrame({ url, busy }: { url: string | null; busy: boolean }) {
  return (
    <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-border bg-surface-2">
      {url ? (
        <SignedImage src={url} alt="Selfie" className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center text-muted-foreground"><Camera className="h-10 w-10" /></div>} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Camera className="h-10 w-10" />
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

function Preview({ title, url, highlight }: { title: string; url: string | null; highlight?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${highlight ? "border-primary shadow-glow" : "border-border"} bg-surface`}>
      <div className="aspect-square w-full bg-surface-2">
        {url ? (
          <SignedImage src={url} alt={title} className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center text-muted-foreground"><Camera className="h-8 w-8" /></div>} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Camera className="h-8 w-8" /></div>
        )}
      </div>
      <div className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{title}</div>
    </div>
  );
}

function Nav({ onBack, onNext, onSkip, nextLabel = "Continue", nextIcon = <ArrowRight className="h-4 w-4" />, disableNext }: {
  onBack?: () => void; onNext?: () => void; onSkip?: () => void;
  nextLabel?: string; nextIcon?: React.ReactNode; disableNext?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <button onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2">
        {onSkip && (
          <button onClick={onSkip} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
        )}
        <button
          onClick={onNext} disabled={disableNext}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {nextLabel} {nextIcon}
        </button>
      </div>
    </div>
  );
}
