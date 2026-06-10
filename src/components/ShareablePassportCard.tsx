import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Share2, ImageOff, RotateCcw, Mail, MessageSquare, Facebook, MessageCircle as WhatsAppIcon, Twitter, Send, Linkedin, Instagram, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { useSubscription } from "@/hooks/use-subscription";
import { getDisplayPhotoUrl } from "@/lib/photos";

type CardData = {
  first_name: string | null;
  city: string | null;
  country: string | null;
  archetype: string | null;
  readiness_score: number | null;
  avatar_url: string | null;
  photo_url: string | null;
  profile_photo_url: string | null;
};

type PhotoChoice = "avatar" | "selfie" | "none";
type Crop = { zoom: number; x: number; y: number }; // x,y in SVG units (~-130..130)
type Prefs = { choice: PhotoChoice; crops: { avatar: Crop; selfie: Crop } };

const DEFAULT_CROP: Crop = { zoom: 1, x: 0, y: 0 };
const DEFAULT_PREFS: Prefs = {
  choice: "avatar",
  crops: { avatar: { ...DEFAULT_CROP }, selfie: { ...DEFAULT_CROP } },
};

const PREFS_VERSION = 1;
const prefsKey = (uid: string) => `unveil-passport-share-prefs-v${PREFS_VERSION}:${uid}`;

function loadPrefs(userId: string): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(prefsKey(userId));
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return {
      choice: (["avatar", "selfie", "none"].includes(p?.choice) ? p.choice : "avatar") as PhotoChoice,
      crops: {
        avatar: { ...DEFAULT_CROP, ...(p?.crops?.avatar || {}) },
        selfie: { ...DEFAULT_CROP, ...(p?.crops?.selfie || {}) },
      },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(userId: string, prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

async function urlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildSvg(
  d: CardData,
  badgeCount: number,
  totalBadges: number,
  photoDataUrl: string | null,
  crop: Crop,
): string {
  const name = (d.first_name || "Your name").slice(0, 24);
  const loc = [d.city, d.country].filter(Boolean).join(" · ").slice(0, 32) || "Somewhere on Earth";
  const archetype = (d.archetype || "Signal").replace(/-/g, " ");
  const score = d.readiness_score ?? 0;

  // Circle center (900, 220), radius 130. Image base box = 260x260.
  const cx = 900;
  const cy = 220;
  const base = 260;
  const size = base * crop.zoom;
  const ix = cx - size / 2 + crop.x;
  const iy = cy - size / 2 + crop.y;

  const photoBlock = photoDataUrl
    ? `<defs><clipPath id="pclip"><circle cx="${cx}" cy="${cy}" r="130"/></clipPath></defs>
       <circle cx="${cx}" cy="${cy}" r="138" fill="none" stroke="#cf3ee3" stroke-width="3"/>
       <image href="${photoDataUrl}" x="${ix}" y="${iy}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pclip)"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#13091f"/>
      <stop offset="60%" stop-color="#261044"/>
      <stop offset="100%" stop-color="#09070d"/>
    </linearGradient>
    <radialGradient id="g1" cx="0.8" cy="0.1" r="0.6">
      <stop offset="0%" stop-color="#cf3ee3" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#f2b861" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect width="1080" height="1350" fill="url(#g1)"/>
  ${photoBlock}
  <text x="60" y="110" fill="#e877f0" font-family="monospace" font-size="22" letter-spacing="8">UNVEIL IDENTITY</text>
  <text x="60" y="240" fill="#f7f0e2" font-family="Georgia, serif" font-size="96" font-weight="300">${name}</text>
  <text x="60" y="290" fill="#d6badf" font-family="Inter, sans-serif" font-size="28">${loc}</text>
  <line x1="60" y1="360" x2="200" y2="360" stroke="#cf3ee3" stroke-width="2"/>
  <text x="60" y="430" fill="#f2b861" font-family="monospace" font-size="18" letter-spacing="6">ARCHETYPE</text>
  <text x="60" y="510" fill="#f7f0e2" font-family="Georgia, serif" font-size="72" font-weight="300" text-transform="capitalize">${archetype}</text>
  <text x="60" y="900" fill="#d6badf" font-family="Inter, sans-serif" font-size="22">Relationship readiness</text>
  <text x="60" y="980" fill="#f7f0e2" font-family="Georgia, serif" font-size="110" font-weight="300">${score}<tspan fill="#d6badf" font-size="40">/100</tspan></text>
  <text x="60" y="1080" fill="#d6badf" font-family="Inter, sans-serif" font-size="22">Passport badges</text>
  <text x="60" y="1140" fill="#f7f0e2" font-family="Georgia, serif" font-size="72" font-weight="300">${badgeCount}<tspan fill="#d6badf" font-size="32"> / ${totalBadges}</tspan></text>
  <text x="60" y="1280" fill="#e877f0" font-family="monospace" font-size="18" letter-spacing="6">UNVEIL.BEST</text>
  <text x="1020" y="1280" fill="#e877f0" font-family="monospace" font-size="18" letter-spacing="4" text-anchor="end">SLOW LOVE · REAL CONNECTION</text>
</svg>`;
}

export function ShareablePassportCard({
  open,
  onOpenChange,
  userId,
  badgeCount,
  totalBadges,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  badgeCount: number;
  totalBadges: number;
}) {
  const [data, setData] = useState<CardData | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userId));
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const { isPremium } = useSubscription();

  // Reload prefs whenever the user changes
  useEffect(() => {
    setPrefs(loadPrefs(userId));
  }, [userId]);

  // Persist on every change
  useEffect(() => {
    savePrefs(userId, prefs);
  }, [userId, prefs]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("first_name, city, country, archetype, readiness_score, avatar_url, photo_url, profile_photo_url")
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data }) => {
        const d = (data as CardData) ?? null;
        setData(d);
        if (d) {
          const [a, s] = await Promise.all([
            urlToDataUrl(await getDisplayPhotoUrl(d.avatar_url || d.photo_url)),
            urlToDataUrl(await getDisplayPhotoUrl(d.profile_photo_url || d.photo_url)),
          ]);
          setAvatarData(a);
          setSelfieData(s);
          // Honor saved choice if the chosen photo exists; otherwise fall back.
          setPrefs((p) => {
            const c = p.choice;
            if (c === "avatar" && a) return p;
            if (c === "selfie" && s) return p;
            if (c === "none") return p;
            return { ...p, choice: a ? "avatar" : s ? "selfie" : "none" };
          });
        }
      });
    trackEvent("shareable_card_opened", { premium: isPremium });
  }, [open, userId, isPremium]);

  const activePhoto =
    prefs.choice === "avatar" ? avatarData : prefs.choice === "selfie" ? selfieData : null;
  const activeCrop =
    prefs.choice === "selfie" ? prefs.crops.selfie : prefs.crops.avatar;

  // Always share the canonical public Passport URL (unveil.best/p/{id}) so
  // scrapers fetch user-specific Open Graph metadata, not the homepage.
  const shareUrl = `https://unveil.best/p/${userId}`;
  const displayName = data?.first_name?.trim() || "My";
  const shareTitle = `${displayName === "My" ? "My" : displayName + "'s"} UNVEIL Passport`;
  const shareText = "See my UNVEIL Passport — slow love, real connection.";
  const enc = encodeURIComponent;
  const mailtoHref = `mailto:?subject=${enc(shareTitle)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`;
  const smsHref = `sms:?&body=${enc(`${shareText} ${shareUrl}`)}`;
  // Each link points to the user's public Passport page, which serves
  // user-specific og:title / og:description / og:image.
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`;
  const twitterHref = `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(shareText)}`;
  const whatsappHref = `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`;
  const telegramHref = `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(shareText)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`;

  async function copyAndOpen(appUrl: string | null, platform: string) {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success(`Link copied — paste it into ${platform}`);
    } catch {
      toast.error("Could not copy link");
    }
    trackEvent(`shareable_card_${platform.toLowerCase()}_clicked`, { premium: isPremium });
    if (appUrl && typeof window !== "undefined") {
      window.open(appUrl, "_blank", "noopener,noreferrer");
    }
  }


  function setChoice(choice: PhotoChoice) {
    setPrefs((p) => ({ ...p, choice }));
    trackEvent("shareable_card_photo_choice", { choice });
  }

  function updateCrop(patch: Partial<Crop>) {
    setPrefs((p) => {
      if (p.choice === "none") return p;
      const key = p.choice;
      return {
        ...p,
        crops: { ...p.crops, [key]: { ...p.crops[key], ...patch } },
      };
    });
  }

  function resetCrop() {
    setPrefs((p) => {
      if (p.choice === "none") return p;
      const key = p.choice;
      return { ...p, crops: { ...p.crops, [key]: { ...DEFAULT_CROP } } };
    });
  }

  function download() {
    if (!data) return;
    const svg = buildSvg(data, badgeCount, totalBadges, activePhoto, activeCrop);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unveil-passport-${(data.first_name || "card").toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    trackEvent("shareable_card_downloaded", { premium: isPremium, photo: prefs.choice });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
      trackEvent("shareable_card_link_copied", { premium: isPremium });
    } catch {
      toast.error("Could not copy");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareTitle, text: shareText, url: shareUrl });
        trackEvent("shareable_card_native_shared", { premium: isPremium });
      } catch {
        /* canceled */
      }
    } else {
      copyLink();
    }
  }

  const svgPreview = useMemo(
    () => (data ? buildSvg(data, badgeCount, totalBadges, activePhoto, activeCrop) : ""),
    [data, badgeCount, totalBadges, activePhoto, activeCrop],
  );

  const choices: { id: PhotoChoice; label: string; available: boolean }[] = [
    { id: "avatar", label: "Avatar", available: !!avatarData },
    { id: "selfie", label: "Real selfie", available: !!selfieData },
    { id: "none", label: "No photo", available: true },
  ];

  const showCropControls = prefs.choice !== "none" && !!activePhoto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share your Passport</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          {svgPreview ? (
            <div
              className="aspect-[4/5] w-full"
              dangerouslySetInnerHTML={{
                __html: svgPreview.replace('width="1080" height="1350"', 'width="100%" height="100%"'),
              }}
            />
          ) : (
            <div className="aspect-[4/5] w-full animate-pulse bg-surface" />
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={() => c.available && setChoice(c.id)}
              disabled={!c.available}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs transition ${
                prefs.choice === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface hover:border-primary/60"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {c.id === "none" && <ImageOff className="h-3.5 w-3.5" />}
              {c.label}
            </button>
          ))}
        </div>

        {showCropControls && (
          <div className="mt-2 space-y-2 rounded-2xl border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Fit the face
              </span>
              <button
                onClick={resetCrop}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <CropSlider
              label="Zoom"
              value={activeCrop.zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(zoom) => updateCrop({ zoom })}
            />
            <CropSlider
              label="Left / Right"
              value={activeCrop.x}
              min={-180}
              max={180}
              step={2}
              onChange={(x) => updateCrop({ x })}
            />
            <CropSlider
              label="Up / Down"
              value={activeCrop.y}
              min={-180}
              max={180}
              step={2}
              onChange={(y) => updateCrop({ y })}
            />
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            onClick={download}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Download className="h-3.5 w-3.5" /> Image
          </button>
          <button
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Copy className="h-3.5 w-3.5" /> Link
          </button>
          <a
            href={mailtoHref}
            onClick={() => trackEvent("shareable_card_email_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
          <button
            onClick={nativeShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-hero px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("shareable_card_facebook_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Facebook className="h-3.5 w-3.5" /> Facebook
          </a>
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("shareable_card_twitter_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Twitter className="h-3.5 w-3.5" /> X
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("shareable_card_whatsapp_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("shareable_card_telegram_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Send className="h-3.5 w-3.5" /> Telegram
          </a>
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("shareable_card_linkedin_clicked", { premium: isPremium })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </a>
          <button
            type="button"
            onClick={() => copyAndOpen("https://www.instagram.com/", "Instagram")}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </button>
          <button
            type="button"
            onClick={() => copyAndOpen("https://www.tiktok.com/", "TikTok")}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
          >
            <Music2 className="h-3.5 w-3.5" /> TikTok
          </button>
        </div>


        <p className="text-center text-[10px] text-muted-foreground">
          Your archetype and readiness only. No private data is shared.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function CropSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}
