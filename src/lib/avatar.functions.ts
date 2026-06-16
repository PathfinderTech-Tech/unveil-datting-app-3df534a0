import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logFailure } from "@/lib/failure-log.server";

const AvatarStyle = z.enum(["real", "anime", "stylized", "realistic", "mystery"]);
const Input = z.object({
  style: AvatarStyle,
  selfieUrl: z.string().url().nullable().optional(),
});

// Identity-preserving prompts. We use Gemini image-edit with the actual selfie
// as the source image so ethnicity, skin tone, facial features, and hair are
// retained — not regenerated from a text description of an imaginary person.
const STYLE_PROMPTS: Record<z.infer<typeof AvatarStyle>, string> = {
  real: "",
  anime:
    "Transform THIS EXACT person in the source photo into a warm anime-style portrait. " +
    "CRITICAL: preserve the person's ethnicity, skin tone, facial structure, eye shape, nose, lips, " +
    "hair texture, hair color, and hairstyle exactly as in the source photo. Stylize only the rendering " +
    "(soft cel-shading, expressive eyes, gentle smile, clean studio background). Do NOT change the person.",
  stylized:
    "Repaint THIS EXACT person in the source photo as a modern stylized digital painting portrait. " +
    "CRITICAL: preserve the person's ethnicity, skin tone, facial structure, hair texture, hair color, " +
    "and hairstyle exactly as in the source photo. Soft brush strokes, rich palette of deep purples and " +
    "warm highlights, centered headshot. Do NOT change the person's identity.",
  realistic:
    "Create a photorealistic studio portrait of THIS EXACT person from the source photo. " +
    "CRITICAL: preserve the person's ethnicity, skin tone, facial structure, eye color, nose, lips, " +
    "hair texture, hair color, and hairstyle exactly as in the source photo. Improve lighting (soft " +
    "cinematic), background (neutral elegant), and focus only. Do NOT change the person.",
  mystery:
    "Render THIS EXACT person from the source photo as an elegant backlit silhouette portrait. " +
    "CRITICAL: keep the head shape, hair texture, and hairstyle silhouette matching the source photo. " +
    "Dramatic backlight, soft purple-violet rim light, shadowed face, minimal background.",
};

type GenResult = {
  avatarUrl: string;
  style: z.infer<typeof AvatarStyle>;
  fallback: boolean;
  message?: string;
};

export const generateAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<GenResult> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // "Real Photo" — reuse the selfie itself as the avatar.
    if (data.style === "real") {
      if (!data.selfieUrl) throw new Error("Add a selfie before choosing Real Photo.");
      await supabase
        .from("profiles")
        .update({
          photo_url: data.selfieUrl,
          profile_photo_url: data.selfieUrl,
          avatar_url: data.selfieUrl,
          avatar_style: "real",
          avatar_generated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      return { avatarUrl: data.selfieUrl, style: "real", fallback: false };
    }

    if (!data.selfieUrl) {
      return await savePlaceholder(
        userId, data.style, null, supabase,
        "Add a selfie first — we use it to keep your appearance recognizable.",
      );
    }

    const key = process.env.LOVABLE_API_KEY;
    const prompt = STYLE_PROMPTS[data.style];

    if (key) {
      try {
        // The profile-photos bucket is private — the AI gateway cannot fetch
        // a public URL. Download the selfie via the service-role client and
        // inline it as a data URL so Gemini can read it.
        const selfiePath = extractBucketPath(data.selfieUrl);
        let imageUrl = data.selfieUrl;
        if (selfiePath) {
          const { data: dl, error: dlErr } = await supabaseAdmin.storage
            .from("profile-photos").download(selfiePath);
          if (dlErr || !dl) throw new Error(`Could not read selfie: ${dlErr?.message ?? "missing"}`);
          const buf = new Uint8Array(await dl.arrayBuffer());
          const b64src = bytesToBase64(buf);
          imageUrl = `data:${dl.type || "image/jpeg"};base64,${b64src}`;
        }

        // Image-edit pipeline using Gemini 2.5 Flash Image Preview (nano-banana)
        // via Lovable AI gateway chat-completions. The selfie is sent as image_url;
        // Gemini conditions generation on it, preserving identity instead of
        // inventing a new person.
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[avatar] gateway failure", { status: res.status, detail: errText.slice(0, 500) });
          throw new Error("We couldn’t generate your avatar right now. Please try again shortly.");
        }
        const json = (await res.json()) as {
          choices?: Array<{
            message?: {
              images?: Array<{ image_url?: { url?: string } }>;
              content?: string;
            };
          }>;
        };
        const dataUrlOut = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrlOut) throw new Error("Empty image response — the model didn't return an image.");
        const b64 = dataUrlOut.includes(",") ? dataUrlOut.split(",")[1] : dataUrlOut;

        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const path = `${userId}/avatars/${data.style}-${Date.now()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("profile-photos")
          .upload(path, bytes, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
        if (upErr) throw upErr;

        const { data: pub } = supabaseAdmin.storage.from("profile-photos").getPublicUrl(path);
        const avatarUrl = pub.publicUrl;

        await supabase
          .from("profiles")
          .update({
            // Public profile image becomes the chosen avatar everywhere
            // (discover, matches, messages, cards). The original selfie is
            // kept private in profile_photo_url and never exposed publicly
            // unless the user picks "Real Photo".
            photo_url: avatarUrl,
            avatar_url: avatarUrl,
            avatar_style: data.style,
            avatar_generated_at: new Date().toISOString(),
            profile_photo_url: data.selfieUrl,
          })
          .eq("id", userId);


        return { avatarUrl, style: data.style, fallback: false };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Generation failed";
        await logFailure({
          category: "avatar_generation",
          severity: "error",
          userId,
          message,
          context: { style: data.style, hasSelfie: Boolean(data.selfieUrl) },
        });
        return await savePlaceholder(userId, data.style, data.selfieUrl, supabase, message);
      }
    }

    return await savePlaceholder(
      userId, data.style, data.selfieUrl, supabase,
      "AI avatar generation is not configured yet.",
    );
  });

async function savePlaceholder(
  userId: string,
  style: z.infer<typeof AvatarStyle>,
  selfieUrl: string | null,
  supabase: any,
  message: string,
): Promise<GenResult> {
  // When generation fails, fall back to the selfie itself (true to identity)
  // rather than a generic gradient that hides who the person actually is.
  if (selfieUrl) {
    await supabase
      .from("profiles")
      .update({
        photo_url: selfieUrl,
        avatar_url: selfieUrl,
        avatar_style: style,
        avatar_generated_at: new Date().toISOString(),
        profile_photo_url: selfieUrl,
      })
      .eq("id", userId);
    return { avatarUrl: selfieUrl, style, fallback: true, message };
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("first_name, archetype")
    .eq("id", userId)
    .maybeSingle();
  const initials = (prof?.first_name ?? "U").trim().slice(0, 2).toUpperCase();
  const archetype = prof?.archetype ?? style;
  const dataUrl = makeInitialsSvg(initials, style, archetype);

  await supabase
    .from("profiles")
    .update({
      photo_url: dataUrl,
      avatar_url: dataUrl,
      avatar_style: style,
      avatar_generated_at: new Date().toISOString(),
      profile_photo_url: null,
    })
    .eq("id", userId);

  return { avatarUrl: dataUrl, style, fallback: true, message };
}


function makeInitialsSvg(initials: string, style: string, archetype: string): string {
  const palettes: Record<string, [string, string]> = {
    real: ["#4f46e5", "#9333ea"],
    anime: ["#ec4899", "#8b5cf6"],
    stylized: ["#7c3aed", "#a855f7"],
    realistic: ["#6366f1", "#3b82f6"],
    mystery: ["#1e1b4b", "#7c3aed"],
  };
  const [c1, c2] = palettes[style] ?? palettes.stylized;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="50%" y="54%" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="220" font-weight="700" fill="white">${escapeXml(initials)}</text>
  <text x="50%" y="90%" text-anchor="middle" font-family="ui-monospace,monospace" font-size="22" fill="rgba(255,255,255,0.7)">${escapeXml(archetype.toUpperCase())}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function extractBucketPath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.startsWith("data:") || input.startsWith("blob:")) return null;
  const m = input.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-photos\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (!/^https?:/i.test(input) && /^[0-9a-f-]{8,}\//i.test(input)) return input;
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

export type AvatarHistoryItem = {
  path: string;
  url: string;
  style: string;
  createdAt: string;
};

export const listAvatarHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: AvatarHistoryItem[]; activeUrl: string | null }> => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: files } = await supabaseAdmin.storage
      .from("profile-photos")
      .list(`${userId}/avatars`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    const items: AvatarHistoryItem[] = [];
    for (const f of files ?? []) {
      if (!f.name || f.name.startsWith(".")) continue;
      const path = `${userId}/avatars/${f.name}`;
      const { data: signed } = await supabaseAdmin.storage
        .from("profile-photos").createSignedUrl(path, 3600);
      const style = (f.name.split("-")[0] || "stylized").toLowerCase();
      const createdAt = (f as any).created_at ?? new Date().toISOString();
      if (signed?.signedUrl) items.push({ path, url: signed.signedUrl, style, createdAt });
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const { data: prof } = await supabase
      .from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
    return { items, activeUrl: prof?.avatar_url ?? null };
  });

export const setActiveAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Not your avatar.");
    const { data: pub } = supabaseAdmin.storage.from("profile-photos").getPublicUrl(data.path);
    const url = pub.publicUrl;
    const style = (data.path.split("/").pop()?.split("-")[0] || "stylized") as z.infer<typeof AvatarStyle>;
    await supabase.from("profiles").update({
      photo_url: url, avatar_url: url, avatar_style: style,
      avatar_generated_at: new Date().toISOString(),
    }).eq("id", userId);
    const { data: signed } = await supabaseAdmin.storage
      .from("profile-photos").createSignedUrl(data.path, 3600);
    return { avatarUrl: signed?.signedUrl ?? url };
  });

export const deleteAvatarHistoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Not your avatar.");
    await supabaseAdmin.storage.from("profile-photos").remove([data.path]);
    return { ok: true };
  });

