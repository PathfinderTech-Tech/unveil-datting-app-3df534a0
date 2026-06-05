import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Share2, ImageOff, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { useSubscription } from "@/hooks/use-subscription";
import { getDisplayPhotoUrl } from "@/lib/photos";

type PhotoChoice = "avatar" | "selfie" | "none";
type Crop = { zoom: number; x: number; y: number }; // x,y in SVG units, ~-130..130
type Prefs = { choice: PhotoChoice; crops: { avatar: Crop; selfie: Crop } };

const DEFAULT_CROP: Crop = { zoom: 1, x: 0, y: 0 };
const DEFAULT_PREFS: Prefs = {
  choice: "avatar",
  crops: { avatar: DEFAULT_CROP, selfie: DEFAULT_CROP },
};

function prefsKey(userId: string) {
  return `unveil-passport-share-prefs:${userId}`;
}

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

function buildSvg(d: CardData, badgeCount: number, totalBadges: number, photoDataUrl: string | null): string {
  const name = (d.first_name || "Your name").slice(0, 24);
  const loc = [d.city, d.country].filter(Boolean).join(" · ").slice(0, 32) || "Somewhere on Earth";
  const archetype = (d.archetype || "Signal").replace(/-/g, " ");
  const score = d.readiness_score ?? 0;

  const photoBlock = photoDataUrl
    ? `<defs><clipPath id="pclip"><circle cx="900" cy="220" r="130"/></clipPath></defs>
       <circle cx="900" cy="220" r="138" fill="none" stroke="#a855f7" stroke-width="3"/>
       <image href="${photoDataUrl}" x="770" y="90" width="260" height="260" preserveAspectRatio="xMidYMid slice" clip-path="url(#pclip)"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0d2e"/>
      <stop offset="60%" stop-color="#2a1248"/>
      <stop offset="100%" stop-color="#3a0f3a"/>
    </linearGradient>
    <radialGradient id="g1" cx="0.8" cy="0.1" r="0.6">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect width="1080" height="1350" fill="url(#g1)"/>
  ${photoBlock}
  <text x="60" y="110" fill="#c4b5fd" font-family="monospace" font-size="22" letter-spacing="8">UNVEIL IDENTITY</text>
  <text x="60" y="240" fill="#ffffff" font-family="Georgia, serif" font-size="96" font-weight="300">${name}</text>
  <text x="60" y="290" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="28">${loc}</text>
  <line x1="60" y1="360" x2="200" y2="360" stroke="#a855f7" stroke-width="2"/>
  <text x="60" y="430" fill="#a855f7" font-family="monospace" font-size="18" letter-spacing="6">ARCHETYPE</text>
  <text x="60" y="510" fill="#ffffff" font-family="Georgia, serif" font-size="72" font-weight="300" text-transform="capitalize">${archetype}</text>
  <text x="60" y="900" fill="#94a3b8" font-family="Inter, sans-serif" font-size="22">Relationship readiness</text>
  <text x="60" y="980" fill="#ffffff" font-family="Georgia, serif" font-size="110" font-weight="300">${score}<tspan fill="#94a3b8" font-size="40">/100</tspan></text>
  <text x="60" y="1080" fill="#94a3b8" font-family="Inter, sans-serif" font-size="22">Passport badges</text>
  <text x="60" y="1140" fill="#ffffff" font-family="Georgia, serif" font-size="72" font-weight="300">${badgeCount}<tspan fill="#94a3b8" font-size="32"> / ${totalBadges}</tspan></text>
  <text x="60" y="1280" fill="#c4b5fd" font-family="monospace" font-size="18" letter-spacing="6">UNVEIL.BEST</text>
  <text x="1020" y="1280" fill="#c4b5fd" font-family="monospace" font-size="18" letter-spacing="4" text-anchor="end">SLOW LOVE · REAL CONNECTION</text>
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
  const [choice, setChoice] = useState<PhotoChoice>("avatar");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const { isPremium } = useSubscription();

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
          // Avatar = avatar_url || photo_url (current profile photo, likely the avatar)
          // Selfie = profile_photo_url (original uploaded selfie)
          const [a, s] = await Promise.all([
            urlToDataUrl(await getDisplayPhotoUrl(d.avatar_url || d.photo_url)),
            urlToDataUrl(await getDisplayPhotoUrl(d.profile_photo_url || d.photo_url)),
          ]);
          setAvatarData(a);
          setSelfieData(s);
          // Default: avatar if available, else selfie, else none
          setChoice(a ? "avatar" : s ? "selfie" : "none");
        }
      });
    trackEvent("shareable_card_opened", { premium: isPremium });
  }, [open, userId, isPremium]);

  const activePhoto = choice === "avatar" ? avatarData : choice === "selfie" ? selfieData : null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/passport` : "/passport";
  const shareText = `My UNVEIL Passport — slow love, real connection.`;

  function download() {
    if (!data) return;
    const svg = buildSvg(data, badgeCount, totalBadges, activePhoto);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unveil-passport-${(data.first_name || "card").toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    trackEvent("shareable_card_downloaded", { premium: isPremium, photo: choice });
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
        await (navigator as any).share({ title: "UNVEIL Passport", text: shareText, url: shareUrl });
        trackEvent("shareable_card_native_shared", { premium: isPremium });
      } catch {
        /* canceled */
      }
    } else {
      copyLink();
    }
  }

  const svgPreview = data ? buildSvg(data, badgeCount, totalBadges, activePhoto) : "";

  const choices: { id: PhotoChoice; label: string; available: boolean }[] = [
    { id: "avatar", label: "Avatar", available: !!avatarData },
    { id: "selfie", label: "Real selfie", available: !!selfieData },
    { id: "none", label: "No photo", available: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your Passport</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          {svgPreview ? (
            <div
              className="aspect-[4/5] w-full"
              dangerouslySetInnerHTML={{ __html: svgPreview.replace('width="1080" height="1350"', 'width="100%" height="100%"') }}
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
                choice === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface hover:border-primary/60"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {c.id === "none" && <ImageOff className="h-3.5 w-3.5" />}
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
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
          <button
            onClick={nativeShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-hero px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Your archetype and readiness only. No private data is shared.
        </p>
      </DialogContent>
    </Dialog>
  );
}
