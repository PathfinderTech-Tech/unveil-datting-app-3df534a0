import { useRef, useState } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";

type Props = {
  userId: string;
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
  label?: string;
};

export function PhotoUpload({ userId, initialUrl, onUploaded, label = "Upload photo" }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error("Pick an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB."); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      setUrl(pub.publicUrl);
      await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", userId);
      onUploaded?.(pub.publicUrl);
      toast.success("Photo uploaded.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface">
        {url ? (
          <SignedImage src={url} alt="Your photo" className="h-full w-full object-cover" fallback={<Camera className="h-8 w-8 text-muted-foreground" />} />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" />
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {url ? <><Check className="h-4 w-4" /> Replace</> : <><Camera className="h-4 w-4" /> {label}</>}
      </button>
    </div>
  );
}
