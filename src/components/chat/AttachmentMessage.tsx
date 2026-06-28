import { useEffect, useState } from "react";
import { FileText, Download, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "chat-attachments";

function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!path) return;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export function ImageAttachmentBubble({
  path,
  mine,
}: {
  path: string;
  mine: boolean;
}) {
  const url = useSignedUrl(path);
  return (
    <div
      className={`max-w-[70%] overflow-hidden rounded-[20px] ${
        mine ? "rounded-br-md" : "rounded-bl-md"
      } border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.5)]`}
    >
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt="Attachment"
            className="block max-h-80 w-full object-cover"
          />
        </a>
      ) : (
        <div className="grid h-48 w-64 place-items-center text-xs text-muted-foreground">
          Loading image…
        </div>
      )}
    </div>
  );
}

export function FileAttachmentBubble({
  path,
  name,
  mine,
}: {
  path: string;
  name: string;
  mine: boolean;
}) {
  const url = useSignedUrl(path);
  return (
    <div
      className={`flex max-w-[75%] items-center gap-3 rounded-[18px] ${
        mine ? "rounded-br-md" : "rounded-bl-md"
      } border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.6)] px-3 py-2.5`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.50_0.16_286)] to-[oklch(0.55_0.18_304)]">
        <FileText className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{name}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {url ? "Tap to download" : "Loading…"}
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="grid h-8 w-8 place-items-center rounded-full bg-[oklch(0.18_0.07_298)] text-foreground/80 hover:text-foreground"
          aria-label={`Download ${name}`}
        >
          <Download className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

/**
 * Parse a location payload stored in messages.content.
 * Format: "lat,lng" or "lat,lng|Label".
 */
export function parseLocationContent(content: string): { lat: number; lng: number; label?: string } | null {
  if (!content) return null;
  const [coords, label] = content.split("|");
  const [latStr, lngStr] = (coords || "").split(",");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: label?.trim() || undefined };
}

function mapsUrlFor(lat: number, lng: number): string {
  // Universal — opens Apple Maps on iOS, Google Maps elsewhere.
  if (typeof navigator !== "undefined" && /iPad|iPhone|iPod|Mac/.test(navigator.userAgent)) {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function LocationMessageBubble({
  content,
  mine,
}: {
  content: string;
  mine: boolean;
}) {
  const loc = parseLocationContent(content);
  if (!loc) {
    return (
      <div className="max-w-[70%] rounded-2xl border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.6)] px-3 py-2 text-xs text-muted-foreground">
        Location unavailable
      </div>
    );
  }
  const href = mapsUrlFor(loc.lat, loc.lng);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`block max-w-[70%] overflow-hidden rounded-[20px] ${
        mine ? "rounded-br-md" : "rounded-bl-md"
      } border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.6)] transition-transform active:scale-[0.98]`}
    >
      <div className="relative h-32 w-64 bg-gradient-to-br from-[oklch(0.22_0.10_240)] via-[oklch(0.18_0.08_260)] to-[oklch(0.16_0.07_286)]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.55_0.15_180/0.6), transparent 55%), radial-gradient(circle at 70% 70%, oklch(0.55_0.18_300/0.5), transparent 50%)" }} />
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[oklch(0.62_0.16_346)] shadow-lg ring-2 ring-white/30">
            <MapPin className="h-5 w-5 text-white" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <Navigation className="h-3.5 w-3.5 text-foreground/70" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">
            {loc.label || "Shared location"}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </div>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/60">Open</span>
      </div>
    </a>
  );
}

export function AudioMessageBubble({
  path,
  name,
  mine,
}: {
  path: string;
  name?: string;
  mine: boolean;
}) {
  const url = useSignedUrl(path);
  return (
    <div
      className={`flex min-w-[220px] max-w-[75%] flex-col gap-1 rounded-[18px] ${
        mine ? "rounded-br-md" : "rounded-bl-md"
      } border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.6)] px-3 py-2.5`}
    >
      {url ? (
        <audio controls src={url} className="w-full" preload="metadata" />
      ) : (
        <div className="text-xs text-muted-foreground">Loading audio…</div>
      )}
      {name && (
        <div className="truncate text-[11px] text-muted-foreground">{name}</div>
      )}
    </div>
  );
}

