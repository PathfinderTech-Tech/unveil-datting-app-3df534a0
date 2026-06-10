import { createFileRoute } from "@tanstack/react-router";
import { decode as decodeJpeg, encode as encodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WIDTH = 1200;
const HEIGHT = 630;
const PHOTO_SIZE = 360;
const PHOTO_X = 760;
const PHOTO_Y = 126;
const UUID_RE = /^[0-9a-f-]{36}$/i;

type ProfileRow = {
  id: string;
  first_name: string | null;
  city: string | null;
  country: string | null;
  archetype: string | null;
  readiness_score: number | null;
  avatar_url: string | null;
  photo_url: string | null;
  profile_photo_url: string | null;
  verified: boolean | null;
};

type RgbaImage = { width: number; height: number; data: Uint8Array | Buffer };

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function setPixel(data: Uint8Array, x: number, y: number, r: number, g: number, b: number, a = 255) {
  const i = (y * WIDTH + x) * 4;
  data[i] = clamp(r);
  data[i + 1] = clamp(g);
  data[i + 2] = clamp(b);
  data[i + 3] = clamp(a);
}

function drawBase(data: Uint8Array) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const tx = x / WIDTH;
      const ty = y / HEIGHT;
      const r = mix(19, 9, ty) + 54 * Math.max(0, 1 - Math.hypot(tx - 0.82, ty - 0.18) * 1.8);
      const g = mix(9, 7, ty) + 8 * Math.max(0, 1 - Math.hypot(tx - 0.82, ty - 0.18) * 1.8);
      const b = mix(31, 13, ty) + 68 * Math.max(0, 1 - Math.hypot(tx - 0.82, ty - 0.18) * 1.8);
      setPixel(data, x, y, r, g, b);
    }
  }
}

function drawCirclePhoto(canvas: Uint8Array, photo: RgbaImage | null, name: string) {
  const cx = PHOTO_X + PHOTO_SIZE / 2;
  const cy = PHOTO_Y + PHOTO_SIZE / 2;
  const radius = PHOTO_SIZE / 2;
  for (let y = PHOTO_Y - 10; y < PHOTO_Y + PHOTO_SIZE + 10; y++) {
    for (let x = PHOTO_X - 10; x < PHOTO_X + PHOTO_SIZE + 10; x++) {
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius + 8 && d >= radius - 1) setPixel(canvas, x, y, 207, 62, 227);
      if (d <= radius) {
        if (photo) {
          const scale = Math.max(PHOTO_SIZE / photo.width, PHOTO_SIZE / photo.height);
          const sw = PHOTO_SIZE / scale;
          const sh = PHOTO_SIZE / scale;
          const sx = Math.floor((photo.width - sw) / 2 + ((x - PHOTO_X) / PHOTO_SIZE) * sw);
          const sy = Math.floor((photo.height - sh) / 2 + ((y - PHOTO_Y) / PHOTO_SIZE) * sh);
          const si = (Math.max(0, Math.min(photo.width - 1, sx)) + Math.max(0, Math.min(photo.height - 1, sy)) * photo.width) * 4;
          const a = (photo.data[si + 3] ?? 255) / 255;
          setPixel(canvas, x, y, mix(38, photo.data[si], a), mix(16, photo.data[si + 1], a), mix(68, photo.data[si + 2], a));
        } else {
          const t = (x - PHOTO_X + y - PHOTO_Y) / (PHOTO_SIZE * 2);
          setPixel(canvas, x, y, mix(124, 236, t), mix(58, 72, t), mix(237, 153, t));
        }
      }
    }
  }

  if (!photo) drawInitial(canvas, name.trim()[0]?.toUpperCase() || "U", cx, cy);
}

function drawInitial(canvas: Uint8Array, initial: string, cx: number, cy: number) {
  const code = initial.charCodeAt(0);
  const blocks = code % 2 === 0
    ? [[-45, -95, 90, 24], [-16, -95, 24, 190], [-45, 71, 90, 24]]
    : [[-45, -95, 90, 24], [-45, -95, 24, 95], [-45, -12, 82, 24], [13, -12, 24, 107], [-45, 71, 82, 24]];
  for (const [dx, dy, w, h] of blocks) {
    for (let y = Math.floor(cy + dy); y < cy + dy + h; y++) {
      for (let x = Math.floor(cx + dx); x < cx + dx + w; x++) {
        if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) setPixel(canvas, x, y, 247, 240, 226, 235);
      }
    }
  }
}

async function readPhoto(input: string | null): Promise<RgbaImage | null> {
  if (!input) return null;
  try {
    let bytes: Uint8Array;
    let type = "";
    const path = extractPhotoPath(input);
    if (path) {
      const { data, error } = await supabaseAdmin.storage.from("profile-photos").download(path);
      if (error || !data) return null;
      type = data.type;
      bytes = new Uint8Array(await data.arrayBuffer());
    } else if (input.startsWith("data:")) {
      const [header, b64] = input.split(",");
      type = header;
      bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
    } else if (/^https:\/\//i.test(input)) {
      const res = await fetch(input, { redirect: "follow" });
      if (!res.ok) return null;
      type = res.headers.get("content-type") ?? "";
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      return null;
    }
    if (type.includes("png") || input.toLowerCase().includes(".png")) return PNG.sync.read(Buffer.from(bytes));
    if (type.includes("jpeg") || type.includes("jpg") || /\.jpe?g($|\?)/i.test(input)) {
      return decodeJpeg(bytes, { useTArray: true, tolerantDecoding: true, maxResolutionInMP: 24 });
    }
  } catch {
    return null;
  }
  return null;
}

function extractPhotoPath(input: string): string | null {
  const m = input.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-photos\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (!/^https?:/i.test(input) && /^[0-9a-f-]{8,}\//i.test(input)) return input;
  return null;
}

function createShareJpeg(profile: ProfileRow, photo: RgbaImage | null) {
  const canvas = new Uint8Array(WIDTH * HEIGHT * 4);
  const name = profile.first_name?.trim() || "Someone";
  drawBase(canvas);
  drawCirclePhoto(canvas, photo, name);
  return encodeJpeg({ width: WIDTH, height: HEIGHT, data: canvas }, 88).data;
}

export const Route = createFileRoute("/api/public/passport-og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = new URL(request.url).searchParams.get("userId") ?? "";
        if (!UUID_RE.test(userId)) return new Response("Not found", { status: 404 });

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, first_name, city, country, archetype, readiness_score, avatar_url, photo_url, profile_photo_url, verified")
          .eq("id", userId)
          .maybeSingle<ProfileRow>();

        if (!profile) return new Response("Not found", { status: 404 });

        const photo = await readPhoto(profile.avatar_url ?? profile.photo_url ?? profile.profile_photo_url);
        const jpeg = createShareJpeg(profile, photo);
        return new Response(jpeg, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(jpeg.length),
          },
        });
      },
    },
  },
});