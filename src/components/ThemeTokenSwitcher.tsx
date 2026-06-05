import { useEffect, useState } from "react";

type Preset = {
  name: string;
  tokens: Record<string, string>;
};

const PRESETS: Preset[] = [
  {
    name: "Logo (default)",
    tokens: {
      "--logo-purple": "oklch(0.67 0.27 310)",
      "--logo-violet": "oklch(0.61 0.27 292)",
      "--logo-magenta": "oklch(0.72 0.28 334)",
      "--logo-rose": "oklch(0.80 0.20 348)",
      "--logo-gold": "oklch(0.82 0.16 67)",
      "--logo-amber": "oklch(0.74 0.18 48)",
    },
  },
  {
    name: "Cool Indigo",
    tokens: {
      "--logo-purple": "oklch(0.62 0.22 268)",
      "--logo-violet": "oklch(0.55 0.22 260)",
      "--logo-magenta": "oklch(0.68 0.20 290)",
      "--logo-rose": "oklch(0.78 0.14 280)",
      "--logo-gold": "oklch(0.80 0.14 200)",
      "--logo-amber": "oklch(0.72 0.16 210)",
    },
  },
  {
    name: "Sunset",
    tokens: {
      "--logo-purple": "oklch(0.68 0.24 30)",
      "--logo-violet": "oklch(0.60 0.22 12)",
      "--logo-magenta": "oklch(0.74 0.22 40)",
      "--logo-rose": "oklch(0.82 0.18 55)",
      "--logo-gold": "oklch(0.84 0.16 80)",
      "--logo-amber": "oklch(0.76 0.18 60)",
    },
  },
  {
    name: "Emerald",
    tokens: {
      "--logo-purple": "oklch(0.62 0.18 165)",
      "--logo-violet": "oklch(0.55 0.18 178)",
      "--logo-magenta": "oklch(0.70 0.18 150)",
      "--logo-rose": "oklch(0.80 0.14 135)",
      "--logo-gold": "oklch(0.84 0.16 100)",
      "--logo-amber": "oklch(0.76 0.18 90)",
    },
  },
];

const STORAGE_KEY = "unveil:theme-preset";

function applyPreset(p: Preset) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p.tokens)) root.style.setProperty(k, v);
}

/**
 * Floating dev-only token switcher. Lets you preview alternate logo palettes
 * at runtime by overriding the --logo-* tokens on :root.
 */
export function ThemeTokenSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(PRESETS[0].name);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = PRESETS.find((x) => x.name === saved);
      if (p) {
        applyPreset(p);
        setActive(p.name);
      }
    }
  }, []);

  function choose(p: Preset) {
    applyPreset(p);
    setActive(p.name);
    localStorage.setItem(STORAGE_KEY, p.name);
  }

  return (
    <div className="fixed bottom-20 right-3 z-50 lg:bottom-4">
      {open && (
        <div className="mb-2 w-56 rounded-2xl border border-border bg-popover/95 p-3 shadow-card backdrop-blur-xl">
          <div className="section-label mb-2">Theme palette</div>
          <div className="flex flex-col gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => choose(p)}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  active === p.name
                    ? "bg-gradient-logo text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{p.name}</span>
                <span className="flex gap-0.5">
                  {Object.values(p.tokens).slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="h-3 w-3 rounded-full border border-white/20"
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle theme palette switcher"
        className="h-10 w-10 rounded-full bg-gradient-logo text-primary-foreground shadow-glow-magenta"
      >
        ✦
      </button>
    </div>
  );
}
