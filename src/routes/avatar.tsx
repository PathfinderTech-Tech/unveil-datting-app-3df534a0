import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { generateAvatar } from "@/lib/avatar.functions";
import { toast } from "sonner";
import {
  Camera, Loader2, Upload, X, ArrowRight, ArrowLeft, Check,
  Sparkles, RefreshCw, Image as ImageIcon, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/avatar")({
  head: () => ({
    meta: [
      { title: "Your Avatar — UNVEIL" },
      { name: "description", content: "Turn your selfie into your UNVEIL avatar." },
    ],
  }),
  component: AvatarPage,
});

type Style = "real" | "anime" | "stylized" | "realistic" | "mystery";

const STYLES: { id: Style; label: string; sub: string; icon: any }[] = [
  { id: "real", label: "Real Photo", sub: "Use your selfie as-is", icon: ImageIcon },
  { id: "anime", label: "Anime Avatar", sub: "Soft, expressive, friendly", icon: Sparkles },
  { id: "stylized", label: "Stylized Avatar", sub: "Painted, modern, premium", icon: Wand2 },
  { id: "realistic", label: "Realistic Portrait", sub: "Cinematic studio look", icon: Camera },
  { id: "mystery", label: "Mystery Avatar", sub: "Silhouette, intriguing", icon: Sparkles },
];

function AvatarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateAvatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);

  // Preload existing values so users can re-roll without re-uploading.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("photo_url, profile_photo_url, avatar_url, avatar_style")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.profile_photo_url || data?.photo_url) {
        setSelfieUrl(data.profile_photo_url ?? data.photo_url);
      }
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        if (data.avatar_style) setStyle(data.avatar_style as Style);
      }
    })();
  }, [user]);

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
      setSelfieUrl(pub.publicUrl);
      await supabase
        .from("profiles")
        .update({ photo_url: pub.publicUrl, profile_photo_url: pub.publicUrl })
        .eq("id", user.id);
      toast.success("Selfie saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  async function runGenerate(chosen: Style) {
    setStyle(chosen);
    setBusy(true);
    setAvatarUrl(null);
    try {
      const res = await generate({ data: { style: chosen, selfieUrl } });
      setAvatarUrl(res.avatarUrl);
      setFallback(res.fallback);
      if (res.fallback && res.message) toast.message(res.message);
      else toast.success("Your UNVEIL avatar is ready.");
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate");
    } finally { setBusy(false); }
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Please <Link to="/login" className="text-primary underline">sign in</Link> to create your avatar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <header className="text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Wand2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl font-light md:text-5xl">
            Your <span className="text-gradient-aura italic">UNVEIL</span> avatar
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Upload a selfie, choose a style, and we'll create your avatar. You can always regenerate or use your real photo.
          </p>
        </header>

        <div className="mt-8 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-hero" : "bg-surface-2"}`} />
          ))}
        </div>

        {/* STEP 0 — Selfie */}
        {step === 0 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Step 1 of 3</div>
              <h2 className="mt-1 font-display text-2xl">Add a selfie</h2>
              <p className="mt-1 text-sm text-muted-foreground">Front-facing, good light, no sunglasses.</p>
            </div>

            <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3">
              <SelfieFrame url={selfieUrl} busy={busy} onClear={() => setSelfieUrl(null)} />
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSelfie(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()} disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60">
                {selfieUrl ? <><Upload className="h-3.5 w-3.5" /> Replace</> : <><Camera className="h-3.5 w-3.5" /> Take or upload selfie</>}
              </button>
            </div>

            <Nav
              onBack={() => navigate({ to: "/onboarding" })}
              onSkip={() => navigate({ to: "/discover" })}
              onNext={() => { if (!selfieUrl) return toast.error("Add a selfie to continue."); setStep(1); }}
            />
          </div>
        )}

        {/* STEP 1 — Style choice */}
        {step === 1 && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Step 2 of 3</div>
              <h2 className="mt-1 font-display text-2xl">Choose an avatar style</h2>
              <p className="mt-1 text-sm text-muted-foreground">You can change this later.</p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((s) => {
                const Icon = s.icon;
                const selected = style === s.id;
                return (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`group rounded-2xl border p-4 text-left transition ${
                      selected ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-surface hover:bg-surface-2"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "bg-gradient-hero text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-display text-sm">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.sub}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <Nav
              onBack={() => setStep(0)}
              onSkip={() => navigate({ to: "/discover" })}
              nextLabel={busy ? "Generating…" : "Generate avatar"}
              nextIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              onNext={() => { if (!style) return toast.error("Pick a style."); runGenerate(style); }}
              disableNext={busy}
            />
          </div>
        )}

        {/* STEP 2 — Result */}
        {step === 2 && (
          <div className="mt-8 rounded-3xl border border-primary bg-card p-6 shadow-glow md:p-8">
            <div className="text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-display text-2xl">Your UNVEIL avatar is ready</h2>
              {fallback && (
                <p className="mt-1 text-xs text-muted-foreground">
                  AI avatar generation will be available soon — using a polished placeholder for now.
                </p>
              )}
            </div>

            <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-2">
              <Preview title="Original selfie" url={selfieUrl} />
              <Preview title={`Avatar · ${STYLES.find((s) => s.id === style)?.label ?? ""}`} url={avatarUrl} highlight />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => navigate({ to: "/discover" })}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
                Use this avatar <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => style && runGenerate(style)} disabled={busy || !style}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm hover:bg-surface-2 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Generate again
              </button>
              <button onClick={() => runGenerate("real")} disabled={busy || !selfieUrl}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm hover:bg-surface-2 disabled:opacity-50">
                <ImageIcon className="h-4 w-4" /> Use real photo instead
              </button>
              <button onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm hover:bg-surface-2">
                <ArrowLeft className="h-4 w-4" /> Change style
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SelfieFrame({ url, busy, onClear }: { url: string | null; busy: boolean; onClear: () => void }) {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface">
      {url ? <img src={url} alt="Selfie" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-muted-foreground" />}
      {busy && <div className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      {url && !busy && (
        <button onClick={onClear} type="button" aria-label="Remove"
          className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Preview({ title, url, highlight }: { title: string; url: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{title}</div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {url ? <img src={url} alt={title} className="h-full w-full object-cover" />
             : <span className="text-xs text-muted-foreground">Not available</span>}
      </div>
    </div>
  );
}

function Nav({
  onBack, onSkip, onNext, disableNext, nextLabel = "Continue", nextIcon = <ArrowRight className="h-4 w-4" />,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  disableNext?: boolean;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button onClick={onBack} disabled={!onBack}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-30">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <div className="flex gap-2">
        {onSkip && (
          <button onClick={onSkip} className="rounded-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
            Skip
          </button>
        )}
        <button onClick={onNext} disabled={disableNext}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
          {nextLabel} {nextIcon}
        </button>
      </div>
    </div>
  );
}
