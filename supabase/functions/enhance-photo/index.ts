// Enhance a user-uploaded photo via Hugging Face GFPGAN.
// Accepts { imageUrl: "<signed url>", image: "<base64 fallback>" } and returns
// { image: "<base64 jpeg/png>" } or a friendly warming-up message.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HF_URL = "https://api-inference.huggingface.co/models/tencentarc/gfpgan";
const HF_SPACE_ROOT = "https://mayanktamakuwala-image-upscaler-and-restoring-gf-5c51069.hf.space";
const FETCH_TIMEOUT_MS = 60_000; // hard upstream timeout
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
  const primary = Promise.race([
    fetch(HF_URL, {
      method: "POST",
      headers,
      body: bytes,
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Model timeout after 60s")), FETCH_TIMEOUT_MS),
    ),
  });

  return await primary.catch(async (error) => {
    console.error("Primary Hugging Face endpoint failed; trying live GFPGAN Space fallback", error);
    return callGradioGFPGAN(bytes);
  }).then(async (res) => {
    const unsupported = res.status === 400 && /not supported/i.test(res.headers.get("x-error-message") ?? "");
    if (unsupported) {
      console.log("3a. Primary model unsupported by current provider; trying live GFPGAN Space fallback");
      return callGradioGFPGAN(bytes);
    }
    return res;
  });
}

function randomSessionHash() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => (n % 36).toString(36)).join("");
}

async function callGradioGFPGAN(bytes: Uint8Array): Promise<Response> {
  console.log("3b. Uploading image to live GFPGAN Space fallback...");
  const form = new FormData();
  form.append("files", new Blob([bytes], { type: "image/png" }), "photo.png");
  const uploadRes = await fetch(`${HF_SPACE_ROOT}/upload`, { method: "POST", body: form });
  console.log("3c. GFPGAN Space upload status:", uploadRes.status);
  if (!uploadRes.ok) throw new Error(`GFPGAN Space upload failed (${uploadRes.status})`);
  const uploaded = await uploadRes.json();
  const path = Array.isArray(uploaded) ? uploaded[0] : null;
  if (typeof path !== "string" || !path) throw new Error("GFPGAN Space did not return an uploaded file path");

  const sessionHash = randomSessionHash();
  const joinPayload = {
    data: [
      {
        path,
        url: `${HF_SPACE_ROOT}/file=${path}`,
        orig_name: "photo.png",
        mime_type: "image/png",
        is_stream: false,
        meta: { _type: "gradio.FileData" },
      },
      "GFPGANv1.4",
      2,
    ],
    event_data: null,
    fn_index: 0,
    trigger_id: 12,
    session_hash: sessionHash,
  };
  const joinRes = await fetch(`${HF_SPACE_ROOT}/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(joinPayload),
  });
  console.log("3d. GFPGAN Space queue join status:", joinRes.status);
  if (!joinRes.ok) throw new Error(`GFPGAN Space queue join failed (${joinRes.status})`);

  const streamController = new AbortController();
  const streamTimer = setTimeout(() => streamController.abort(), FETCH_TIMEOUT_MS);
  try {
    const streamRes = await fetch(`${HF_SPACE_ROOT}/queue/data?session_hash=${sessionHash}`, {
      headers: { Accept: "text/event-stream" },
      signal: streamController.signal,
    });
    console.log("3e. GFPGAN Space stream status:", streamRes.status);
    if (!streamRes.ok || !streamRes.body) throw new Error(`GFPGAN Space stream failed (${streamRes.status})`);
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const event = JSON.parse(line.slice(6));
        console.log("3f. GFPGAN Space event:", event.msg);
        if (event.msg !== "process_completed") continue;
        if (!event.success) throw new Error(event.output?.error || "GFPGAN Space processing failed");
        const imageUrl = event.output?.data?.[0]?.url;
        if (typeof imageUrl !== "string") throw new Error("GFPGAN Space did not return an enhanced image URL");
        console.log("3g. Downloading GFPGAN Space enhanced image...");
        const imageRes = await fetch(imageUrl);
        console.log("3h. GFPGAN Space enhanced image status:", imageRes.status);
        if (!imageRes.ok) throw new Error(`GFPGAN Space image download failed (${imageRes.status})`);
        const contentType = imageRes.headers.get("content-type") || "image/webp";
        return new Response(await imageRes.arrayBuffer(), { status: 200, headers: { "content-type": contentType } });
      }
    }
  } finally {
    clearTimeout(streamTimer);
  }
  throw new Error("GFPGAN Space stream ended without an enhanced image");
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
      if (e instanceof Error && /timeout|aborted/i.test(e.message)) {
        return json({ error: "AI enhancement timed out" }, 408);
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
        if (e instanceof Error && /timeout|aborted/i.test(e.message)) {
          return json({ error: "AI enhancement timed out" }, 408);
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
