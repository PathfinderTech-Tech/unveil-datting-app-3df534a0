// Enhance a user-uploaded photo via Hugging Face GFPGAN.
// Accepts { imageUrl: "<signed url>", image: "<base64 fallback>" } and returns
// { image: "<base64 jpeg/png>" } or a friendly warming-up message.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HF_URL = "https://api-inference.huggingface.co/models/tencentarc/gfpgan";
const HF_FALLBACK_URL = "https://router.huggingface.co/hf-inference/models/Hyratek/GFPGANv1.4-QAIC";
const FETCH_TIMEOUT_MS = 30_000; // hard upstream timeout
const RETRY_DELAY_MS = 10_000;   // wait after a 503 before retrying once
const FAIL_MSG = "AI Enhancement unavailable right now — try again in a moment.";

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

async function callHF(bytes: Uint8Array, apiKey: string): Promise<Response> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/octet-stream",
    Accept: "image/png",
  };
  console.log("3. Calling Hugging Face model...", HF_URL);
  return await Promise.race([
    fetch(HF_URL, {
      method: "POST",
      headers,
      body: bytes,
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Model timeout after 30s")), FETCH_TIMEOUT_MS),
    ),
  ]).catch(async (error) => {
    console.error("Primary Hugging Face endpoint failed; trying fallback router", error);
    console.log("3. Calling Hugging Face fallback model...", HF_FALLBACK_URL);
    return await Promise.race([
      fetch(HF_FALLBACK_URL, { method: "POST", headers, body: bytes }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Model timeout after 30s")), FETCH_TIMEOUT_MS),
      ),
    ]);
  });
}

async function fetchImageBytes(imageUrl: string): Promise<Uint8Array> {
  console.log("2a. Fetching uploaded image URL");
  const res = await Promise.race([
    fetch(imageUrl, { headers: { Accept: "image/*" } }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Image URL fetch timeout")), 15_000),
    ),
  ]);
  console.log("2b. Uploaded image URL fetch status:", res.status);
  if (!res.ok) throw new Error(`Could not fetch uploaded image URL (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  console.log("2c. Uploaded image bytes received:", bytes.byteLength);
  return bytes;
}

function logStepError(step: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`${step} failed`, { message, stack });
}

Deno.serve(async (req) => {
  try {
    console.log("1. Request received");
  } catch (e) {
    logStepError("1. Request received", e);
  }

  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    logStepError("request method check", e);
    return json({ error: FAIL_MSG }, 500);
  }

  let apiKey: string | undefined;
  try {
    apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
    console.log("2. Hugging Face API key loaded:", Boolean(apiKey));
    if (!apiKey) return json({ error: "Server is not configured for AI enhancement." }, 500);
  } catch (e) {
    logStepError("read HUGGINGFACE_API_KEY", e);
    return json({ error: FAIL_MSG }, 500);
  }

  let payload: { image?: string; imageUrl?: string } = {};
  try {
    payload = await req.json();
  } catch (e) {
    logStepError("parse JSON body", e);
    return json({ error: "Invalid JSON body" }, 400);
  }
  if ((!payload.image || typeof payload.image !== "string") && (!payload.imageUrl || typeof payload.imageUrl !== "string")) {
    return json({ error: "Missing 'imageUrl' or 'image'" }, 400);
  }
  const imageBase64 = payload.image ?? "";
  try {
    console.log("2. Image payload received", {
      imageUrl: payload.imageUrl ?? null,
      base64Size: imageBase64.length,
    });
  } catch (e) {
    logStepError("2. Image payload received", e);
  }

  let bytes: Uint8Array;
  try {
    if (payload.imageUrl) {
      bytes = await fetchImageBytes(payload.imageUrl);
    } else {
      const { data } = stripDataUrl(imageBase64);
      bytes = b64ToBytes(data);
    }
  } catch (e) {
    logStepError("read source image", e);
    return json({ error: e instanceof Error ? e.message : "Invalid source image" }, 400);
  }
  if (bytes.length > 8 * 1024 * 1024) {
    return json({ error: "Image too large (max 8MB)" }, 413);
  }
  console.log("2d. Image bytes ready for Hugging Face, size:", bytes.byteLength);

  try {
    let hfRes: Response;
    try {
      hfRes = await callHF(bytes, apiKey);
    } catch (e) {
      console.error("enhance-photo upstream error (attempt 1)", e);
      logStepError("3. Calling Hugging Face model", e);
      if (e instanceof Error && e.message === "Model timeout after 30s") {
        return json({ message: "Model timeout after 30s" }, 408);
      }
      return json({ error: FAIL_MSG }, 503);
    }
    try {
      console.log("4. HF response status:", hfRes.status);
      console.log("5. HF response headers:", Object.fromEntries(hfRes.headers));
    } catch (e) {
      logStepError("HF response logging", e);
    }

    // Retry once after 10s on 503 (model loading)
    if (hfRes.status === 503) {
      console.log("5a. HF returned 503; retrying once after 10 seconds");
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      try {
        hfRes = await callHF(bytes, apiKey);
      } catch (e) {
        console.error("enhance-photo upstream error (retry)", e);
        logStepError("3. Calling Hugging Face model retry", e);
        if (e instanceof Error && e.message === "Model timeout after 30s") {
          return json({ message: "Model timeout after 30s" }, 408);
        }
        return json({ error: FAIL_MSG }, 503);
      }
      try {
        console.log("4. HF response status:", hfRes.status);
        console.log("5. HF response headers:", Object.fromEntries(hfRes.headers));
      } catch (e) {
        logStepError("HF retry response logging", e);
      }
      if (hfRes.status === 503) {
        return json({ warming: true, message: "AI warming up, try again in 20 seconds" }, 503);
      }
    }

    if (!hfRes.ok) {
      const text = await hfRes.text().catch(() => "");
      console.error("HF error", hfRes.status, text.slice(0, 300));
      if (hfRes.status === 401 || hfRes.status === 403) {
        return json({ error: FAIL_MSG }, 502);
      }
      if (hfRes.status === 429) {
        return json({ error: FAIL_MSG }, 429);
      }
      return json({ error: FAIL_MSG }, 502);
    }

    const contentType = hfRes.headers.get("content-type") || "image/png";
    if (contentType.startsWith("application/json")) {
      const j = await hfRes.json().catch(() => ({}));
      if (typeof j?.error === "string" && /loading/i.test(j.error)) {
        return json({ warming: true, message: "AI warming up, try again in 20 seconds" }, 503);
      }
      return json({ error: FAIL_MSG }, 502);
    }

    let enhancedBuffer: Uint8Array;
    try {
      enhancedBuffer = new Uint8Array(await hfRes.arrayBuffer());
      console.log("6. Image buffer size:", enhancedBuffer.byteLength);
    } catch (e) {
      logStepError("6. Image buffer size", e);
      return json({ error: FAIL_MSG }, 502);
    }
    let outB64: string;
    try {
      outB64 = bytesToB64(enhancedBuffer);
      console.log("7. Base64 conversion complete");
    } catch (e) {
      logStepError("7. Base64 conversion", e);
      return json({ error: FAIL_MSG }, 500);
    }
    try {
      console.log("8. Returning success response");
    } catch (e) {
      logStepError("8. Returning success response", e);
    }
    return json({ image: `data:${contentType};base64,${outB64}` });
  } catch (e) {
    console.error("enhance-photo error", e);
    logStepError("enhance-photo outer handler", e);
    return json({ error: FAIL_MSG }, 500);
  }
});
