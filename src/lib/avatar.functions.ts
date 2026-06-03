import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AvatarStyle = z.enum(["real", "anime", "stylized", "realistic", "mystery"]);
const Input = z.object({
  style: AvatarStyle,
  selfieUrl: z.string().url().nullable().optional(),
});

const STYLE_PROMPTS: Record<z.infer<typeof AvatarStyle>, string> = {
  real: "",
  anime: "A warm, friendly anime-style portrait avatar of a single person, soft cel-shading, expressive eyes, gentle smile, clean studio background, centered headshot, premium quality, no text.",
  stylized: "A modern stylized digital painting portrait avatar of a single person, soft brush strokes, rich color palette of deep purples and warm highlights, centered headshot, premium quality, no text.",
  realistic: "A photorealistic studio portrait headshot of a single warm, approachable person, soft cinematic lighting, shallow depth of field, neutral elegant background, centered, premium quality, no text.",
  mystery: "An elegant silhouette portrait avatar of a single person, dramatic backlight, soft purple-violet rim light, mysterious shadowed face, minimal background, premium quality, no text.",
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

    const key = process.env.LOVABLE_API_KEY;
    const prompt = STYLE_PROMPTS[data.style];

    // Try AI generation; on any failure, fall back gracefully without throwing.
    if (key) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt,
            size: "1024x1024",
            quality: "low",
            n: 1,
          }),
        });
        if (!res.ok) {
          if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
          if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
          throw new Error(`Generation failed (${res.status})`);
        }
        const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) throw new Error("Empty image response");

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
            avatar_url: avatarUrl,
            avatar_style: data.style,
            avatar_generated_at: new Date().toISOString(),
            profile_photo_url: data.selfieUrl ?? null,
          })
          .eq("id", userId);

        return { avatarUrl, style: data.style, fallback: false };
      } catch (e) {
        // fall through to placeholder
        const message = e instanceof Error ? e.message : "Generation failed";
        return await savePlaceholder(userId, data.style, data.selfieUrl ?? null, supabase, message);
      }
    }

    return await savePlaceholder(
      userId,
      data.style,
      data.selfieUrl ?? null,
      supabase,
      "AI avatar generation will be available soon.",
    );
  });

async function savePlaceholder(
  userId: string,
  style: z.infer<typeof AvatarStyle>,
  selfieUrl: string | null,
  supabase: any,
  message: string,
): Promise<GenResult> {
  // Pull first name + archetype to make the placeholder feel personal.
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
      avatar_url: dataUrl,
      avatar_style: style,
      avatar_generated_at: new Date().toISOString(),
      profile_photo_url: selfieUrl,
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
