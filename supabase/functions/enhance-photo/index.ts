// Enhance a user-uploaded photo via Hugging Face GFPGAN.
// Accepts { image: "<base64>" } (optionally a data URL) and returns
// { image: "<base64 jpeg/png>" } or a friendly warming-up message.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HF_URL = "https://api-inference.huggingface.co/models/tencentarc/gfpgan";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripDataUrl(b64: string): { mime: string; data: string } {
  const m = b64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: b64 };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) return json({ error: "Server is not configured for AI enhancement." }, 500);

  let payload: { image?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.image || typeof payload.image !== "string") {
    return json({ error: "Missing 'image' (base64 string)" }, 400);
  }

  const { data } = stripDataUrl(payload.image);
  let bytes: Uint8Array;
  try {
    bytes = b64ToBytes(data);
  } catch {
    return json({ error: "Invalid base64 image" }, 400);
  }
  if (bytes.length > 8 * 1024 * 1024) {
    return json({ error: "Image too large (max 8MB)" }, 413);
  }

  try {
    const hfRes = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
        Accept: "image/png",
      },
      body: bytes,
    });

    if (hfRes.status === 503) {
      return json({ warming: true, message: "AI warming up, try again in 20 seconds" }, 503);
    }

    if (!hfRes.ok) {
      const text = await hfRes.text().catch(() => "");
      console.error("HF error", hfRes.status, text.slice(0, 300));
      if (hfRes.status === 401 || hfRes.status === 403) {
        return json({ error: "AI service authentication failed." }, 502);
      }
      if (hfRes.status === 429) {
        return json({ error: "AI is busy. Please try again shortly." }, 429);
      }
      return json({ error: "AI enhancement failed. Please try again." }, 502);
    }

    const contentType = hfRes.headers.get("content-type") || "image/png";
    if (contentType.startsWith("application/json")) {
      const j = await hfRes.json().catch(() => ({}));
      if (typeof j?.error === "string" && /loading/i.test(j.error)) {
        return json({ warming: true, message: "AI warming up, try again in 20 seconds" }, 503);
      }
      return json({ error: "AI enhancement failed." }, 502);
    }

    const buf = new Uint8Array(await hfRes.arrayBuffer());
    const outB64 = bytesToB64(buf);
    return json({ image: `data:${contentType};base64,${outB64}` });
  } catch (e) {
    console.error("enhance-photo error", e);
    return json({ error: "Unexpected error during enhancement." }, 500);
  }
});
