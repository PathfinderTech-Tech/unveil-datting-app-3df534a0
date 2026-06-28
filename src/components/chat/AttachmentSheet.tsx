import { Camera, Image as ImageIcon, FileText, MapPin, Mic, Gift, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onGift: () => void;
  onCamera: () => void;
  onPhotoLibrary: () => void;
  onFile: () => void;
  onLocation: () => void;
  onAudio: () => void;
};

/**
 * Standard messenger-style attachment menu. The "+" button in the chat
 * composer opens this — distinct from the AI Sparkles button, which is
 * dedicated to AI assistance only.
 */
export function AttachmentSheet({ open, onClose, onGift, onCamera, onPhotoLibrary, onFile, onLocation, onAudio }: Props) {
  if (!open) return null;

  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const items = [
    {
      id: "camera",
      label: "Camera",
      icon: Camera,
      tint: "from-[oklch(0.55_0.18_286)] to-[oklch(0.60_0.16_304)]",
      onClick: wrap(onCamera),
    },
    {
      id: "photo",
      label: "Photo Library",
      icon: ImageIcon,
      tint: "from-[oklch(0.58_0.16_220)] to-[oklch(0.50_0.16_260)]",
      onClick: wrap(onPhotoLibrary),
    },
    {
      id: "file",
      label: "Files",
      icon: FileText,
      tint: "from-[oklch(0.55_0.14_180)] to-[oklch(0.50_0.15_200)]",
      onClick: wrap(onFile),
    },
    {
      id: "location",
      label: "Location",
      icon: MapPin,
      tint: "from-[oklch(0.55_0.16_160)] to-[oklch(0.50_0.15_140)]",
      onClick: wrap(onLocation),
    },
    {
      id: "audio",
      label: "Audio",
      icon: Mic,
      tint: "from-[oklch(0.55_0.18_300)] to-[oklch(0.50_0.18_330)]",
      onClick: wrap(onAudio),
    },
    {
      id: "gift",
      label: "Gift",
      icon: Gift,
      tint: "from-[oklch(0.62_0.16_346)] to-[oklch(0.55_0.16_328)]",
      onClick: wrap(onGift),
    },
  ];

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Attachment menu">
      <button
        type="button"
        aria-label="Close attachments"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[oklch(0.56_0.22_286/0.22)] bg-[oklch(0.10_0.04_298/0.95)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-20px_60px_-20px_oklch(0_0_0/0.6)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-foreground">Attach</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-[oklch(0.18_0.07_298/0.6)] text-foreground/70 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-[oklch(0.56_0.22_286/0.15)] bg-[oklch(0.13_0.05_298/0.5)] px-2 py-4 transition-all hover:bg-[oklch(0.18_0.07_298/0.7)] active:scale-95"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${it.tint} shadow-[inset_0_1px_0_oklch(1_0_0/0.1)]`}>
                <it.icon className="h-5 w-5 text-white" />
              </span>
              <span className="text-[11px] font-medium tracking-tight text-foreground/85">{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
