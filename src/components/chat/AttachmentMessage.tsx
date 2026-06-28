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
