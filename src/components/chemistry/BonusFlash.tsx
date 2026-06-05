import { useEffect, useState } from "react";

export function BonusFlash({ label, onDone }: { label: string; onDone?: () => void }) {
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setMounted(false); onDone?.(); }, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!mounted) return null;
  return (
    <span
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{
        top: "-28px",
        color: "#A78BFA",
        borderColor: "rgba(139,92,246,0.35)",
        background: "rgba(139,92,246,0.14)",
        animation: "chem-bonus-float 1.6s ease-out forwards",
      }}
    >
      ✦ {label}
    </span>
  );
}
