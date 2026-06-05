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
        color: "var(--logo-rose)",
        borderColor: "color-mix(in oklch, var(--logo-purple) 35%, transparent)",
        background: "color-mix(in oklch, var(--logo-purple) 16%, transparent)",
        animation: "chem-bonus-float 1.6s ease-out forwards",
      }}
    >
      ✦ {label}
    </span>
  );
}
