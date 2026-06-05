import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PresetName = "Logo" | "Cool Indigo" | "Sunset" | "Emerald";

type Preset = {
  name: PresetName;
  tokens: Record<string, string>;
};

const BASE_PRESETS: Preset[] = [
  {
    name: "Logo",
    tokens: {
      "--logo-violet": "oklch(0.56 0.22 286)",
      "--logo-purple": "oklch(0.61 0.22 304)",
      "--logo-magenta": "oklch(0.65 0.20 328)",
      "--logo-rose": "oklch(0.72 0.14 346)",
      "--logo-gold": "oklch(0.80 0.14 68)",
      "--logo-amber": "oklch(0.70 0.14 48)",
    },
  },
  {
    name: "Cool Indigo",
    tokens: {
      "--logo-violet": "oklch(0.52 0.18 258)",
      "--logo-purple": "oklch(0.58 0.18 270)",
      "--logo-magenta": "oklch(0.62 0.16 292)",
      "--logo-rose": "oklch(0.70 0.10 286)",
      "--logo-gold": "oklch(0.76 0.10 204)",
      "--logo-amber": "oklch(0.68 0.12 214)",
    },
  },
  {
    name: "Sunset",
    tokens: {
      "--logo-violet": "oklch(0.54 0.16 22)",
      "--logo-purple": "oklch(0.60 0.18 30)",
      "--logo-magenta": "oklch(0.66 0.17 42)",
      "--logo-rose": "oklch(0.74 0.13 56)",
      "--logo-gold": "oklch(0.80 0.14 78)",
      "--logo-amber": "oklch(0.70 0.14 60)",
    },
  },
  {
    name: "Emerald",
    tokens: {
      "--logo-violet": "oklch(0.50 0.13 178)",
      "--logo-purple": "oklch(0.56 0.14 164)",
      "--logo-magenta": "oklch(0.62 0.14 150)",
      "--logo-rose": "oklch(0.72 0.10 136)",
      "--logo-gold": "oklch(0.78 0.13 98)",
      "--logo-amber": "oklch(0.68 0.14 88)",
    },
  },
];

const ACTIVE_KEY = "unveil:theme-preset";
const CUSTOM_KEY = "unveil:theme-custom-tokens";
const TOKEN_NAME_RE = /^--[a-z0-9-]+$/i;

function mergeCustomTokens(custom: Record<string, Record<string, string>>) {
  return BASE_PRESETS.map((preset) => ({
    ...preset,
    tokens: { ...preset.tokens, ...(custom[preset.name] ?? {}) },
  }));
}

function applyTokens(tokens: Record<string, string>) {
  const root = document.documentElement;
  // Apply atomically in a single frame to prevent flicker / partial paints.
  requestAnimationFrame(() => {
    const sanitized = sanitizeTokens(tokens);
    for (const [name, value] of Object.entries(sanitized)) {
      root.style.setProperty(name, value.trim());
    }
  });
}

function isColorValue(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed) && (typeof CSS === "undefined" || CSS.supports("color", trimmed));
}

function sanitizeTokens(tokens: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(tokens).filter(([name, value]) => TOKEN_NAME_RE.test(name) && isColorValue(value)),
  );
}

function readCustomTokens() {
  try {
    const saved = localStorage.getItem(CUSTOM_KEY);
    return saved ? (JSON.parse(saved) as Record<string, Record<string, string>>) : {};
  } catch {
    return {};
  }
}

export function ThemeTokenSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PresetName>("Logo");
  const [custom, setCustom] = useState<Record<string, Record<string, string>>>({});
  const [draft, setDraft] = useState<Record<string, string>>(BASE_PRESETS[0].tokens);
  const [newName, setNewName] = useState("--logo-custom");
  const [newValue, setNewValue] = useState("oklch(0.64 0.16 300)");

  const presets = useMemo(() => mergeCustomTokens(custom), [custom]);
  const activePreset = presets.find((preset) => preset.name === active) ?? presets[0];

  // Debounce live edits so rapid keystrokes coalesce into a single atomic CSS write.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleApply = useCallback((tokens: Record<string, string>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyTokens(tokens), 90);
  }, []);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    const savedCustom = readCustomTokens();
    const savedActive = localStorage.getItem(ACTIVE_KEY) as PresetName | null;
    const merged = mergeCustomTokens(savedCustom);
    const nextActive = merged.some((preset) => preset.name === savedActive) ? savedActive! : "Logo";
    const nextPreset = merged.find((preset) => preset.name === nextActive) ?? merged[0];
    setCustom(savedCustom);
    setActive(nextActive);
    setDraft(nextPreset.tokens);
    applyTokens(nextPreset.tokens);
  }, []);

  function choose(preset: Preset) {
    setActive(preset.name);
    setDraft(preset.tokens);
    applyTokens(preset.tokens);
    localStorage.setItem(ACTIVE_KEY, preset.name);
  }

  function saveDraft() {
    const sanitized = sanitizeTokens(draft);
    const nextCustom = { ...custom, [activePreset.name]: sanitized };
    setCustom(nextCustom);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(nextCustom));
    applyTokens(sanitized);
  }

  function resetPreset() {
    const nextCustom = { ...custom };
    delete nextCustom[activePreset.name];
    const base = BASE_PRESETS.find((preset) => preset.name === activePreset.name) ?? BASE_PRESETS[0];
    setCustom(nextCustom);
    setDraft(base.tokens);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(nextCustom));
    applyTokens(base.tokens);
  }

  function addToken() {
    const name = newName.trim();
    const value = newValue.trim();
    if (!TOKEN_NAME_RE.test(name) || !isColorValue(value)) return;
    const next = { ...draft, [name]: value };
    setDraft(next);
    applyTokens(sanitizeTokens(next));
  }

  return (
    <div className="fixed bottom-20 right-3 z-50 lg:bottom-4">
      {open && (
        <div className="mb-2 max-h-[calc(100vh-7rem)] w-[min(92vw,360px)] overflow-y-auto rounded-2xl border border-border bg-popover/95 p-3 shadow-card backdrop-blur-xl">
          <div className="section-label mb-2">Theme palette</div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => choose(preset)}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  activePreset.name === preset.name
                    ? "bg-gradient-logo text-primary-foreground shadow-glow-magenta"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{preset.name}</span>
                <span className="flex gap-0.5">
                  {Object.values(preset.tokens).slice(0, 4).map((color, index) => (
                    <span
                      key={`${preset.name}-${index}`}
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ background: color }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-background/35 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">{activePreset.name} tokens</span>
              <button onClick={resetPreset} className="text-xs text-muted-foreground hover:text-primary">
                Reset
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.entries(draft).map(([name, value]) => (
                <label key={name} className="grid grid-cols-[104px_1fr_18px] items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{name.replace("--logo-", "")}</span>
                  <input
                    value={value}
                    onChange={(event) => {
                      const next = { ...draft, [name]: event.target.value };
                      setDraft(next);
                      scheduleApply(next);
                    }}
                    className="min-w-0 rounded-md border border-input bg-background px-2 py-1 font-mono text-[10px] text-foreground outline-none focus:border-primary"
                  />
                  <span className="h-4 w-4 rounded-full border border-border" style={{ background: value }} />
                </label>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="min-w-0 rounded-md border border-input bg-background px-2 py-1 font-mono text-[10px] text-foreground outline-none focus:border-primary"
              />
              <input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                className="min-w-0 rounded-md border border-input bg-background px-2 py-1 font-mono text-[10px] text-foreground outline-none focus:border-primary"
              />
              <button onClick={addToken} className="rounded-md border border-border px-2 text-xs text-foreground hover:bg-muted">
                Add
              </button>
            </div>

            <button
              onClick={saveDraft}
              className="mt-2 w-full rounded-lg bg-gradient-logo px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow-magenta"
            >
              Save {activePreset.name}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle theme palette switcher"
        className="h-10 w-10 rounded-full bg-gradient-logo text-primary-foreground shadow-glow-magenta"
      >
        ✦
      </button>
    </div>
  );
}
