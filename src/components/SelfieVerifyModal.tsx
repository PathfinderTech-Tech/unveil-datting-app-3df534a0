import { useNavigate } from "@tanstack/react-router";
import { Camera, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Where to return after a successful selfie capture (e.g. /chat?c=abc). */
  returnTo?: string;
};

/**
 * Selfie verification gate shown before an unverified user sends their
 * first message or voice note. Routes to the existing Photo Studio
 * (/avatar), which captures the selfie and marks the profile verified.
 */
export function SelfieVerifyModal({ open, onClose, returnTo }: Props) {
  const navigate = useNavigate();
  const [learnMore, setLearnMore] = useState(false);
  if (!open) return null;

  const goCapture = () => {
    onClose();
    if (returnTo) {
      try { sessionStorage.setItem("unveil:verify_return", returnTo); } catch { /* ignore */ }
    }
    navigate({ to: "/avatar" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-glow">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-surface"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-6 pt-7 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-light">
            Verify you're a <span className="text-gradient-aura italic">real person</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Please verify that you are a real person by taking a quick selfie.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your selfie is used only for safety and authenticity checks. It will not be shown
            publicly unless you choose to use it as your profile photo. This helps protect the
            Unveil community from fake profiles.
          </p>
          {learnMore && (
            <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-3 text-left text-[12px] text-muted-foreground">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-luxury text-foreground/80">
                What we store
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>One private selfie image, stored encrypted in your profile bucket.</li>
                <li>Verification timestamp so moderators can confirm authenticity.</li>
                <li>Your public profile photo stays separate — you choose what others see.</li>
                <li>Selfies are never shown in Discover, Matches, Messages, or Chat.</li>
              </ul>
            </div>
          )}
        </div>
        <div className="grid gap-2 p-6">
          <button
            onClick={goCapture}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Camera className="h-4 w-4" /> Take Selfie
          </button>
          <button
            onClick={() => setLearnMore((v) => !v)}
            className="rounded-full border border-border py-2 text-xs text-muted-foreground hover:bg-surface"
          >
            {learnMore ? "Hide details" : "Learn More"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
