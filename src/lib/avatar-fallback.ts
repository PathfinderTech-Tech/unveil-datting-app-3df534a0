// Deterministic SVG-based fallback avatar so no profile card is ever blank.
// Produces a data URL that can be used wherever an `<img src>` is expected.

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PALETTES: ReadonlyArray<[string, string, string]> = [
  ["#7c3aed", "#ec4899", "#f59e0b"], // violet → magenta → gold (logo)
  ["#0ea5e9", "#6366f1", "#a855f7"], // sky → indigo → purple
  ["#10b981", "#06b6d4", "#3b82f6"], // emerald → cyan → blue
  ["#f97316", "#ef4444", "#ec4899"], // orange → red → pink
  ["#facc15", "#f97316", "#dc2626"], // amber → orange → red
  ["#8b5cf6", "#3b82f6", "#06b6d4"], // violet → blue → cyan
];

/** Returns a stable gradient + initial avatar as a data: URL. */
export function getAvatarFallback(seed: string | null | undefined, label?: string | null): string {
  const key = (seed && seed.length > 0 ? seed : "unveil").toString();
  const h = hash(key);
  const [a, b, c] = PALETTES[h % PALETTES.length];
  const initial = (label?.trim()?.[0] ?? key[0] ?? "U").toUpperCase();
  const angle = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">
        <stop offset="0%" stop-color="${a}"/>
        <stop offset="55%" stop-color="${b}"/>
        <stop offset="100%" stop-color="${c}"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" fill="url(#g)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto"
      font-size="120" font-weight="700" fill="rgba(255,255,255,.92)">${escapeXml(initial)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (ch) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[ch] as string));
}

/** Pick the right URL to show for a profile, never returning empty. */
export function resolveProfileImage(
  opts: {
    discoveryMode?: "avatar" | "photo" | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    seed?: string | null;
    label?: string | null;
  },
): string {
  const { discoveryMode, avatarUrl, photoUrl, seed, label } = opts;
  // Always prefer the real photo so we can render it behind a veil rather than
  // showing initials or generated gradient circles. Avatar/discovery mode is
  // only honoured as a last resort when no photo exists.
  if (photoUrl) return photoUrl;
  if (discoveryMode === "avatar" && avatarUrl) return avatarUrl;
  return photoUrl || avatarUrl || getAvatarFallback(seed ?? label ?? "unveil", label);
}
