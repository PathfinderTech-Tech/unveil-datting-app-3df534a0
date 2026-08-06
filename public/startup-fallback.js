(function () {
  var errors = [];
  window.__UNVEIL_STARTUP_ERRORS__ = errors;
  window.__UNVEIL_NATIVE_START__ = {
    href: window.location.href,
    userAgent: window.navigator.userAgent,
    startedAt: Date.now()
  };
  window.process = window.process || { env: {} };
  window.process.env = window.process.env || {};

  function asText(value) {
    if (!value) return "Unknown startup error";
    if (typeof value === "string") return value;
    if (value.message) return value.message;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }

  function showFallback(reason) {
    if (document.documentElement.getAttribute("data-unveil-ready") === "1") return;
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", function () { showFallback(reason); }, { once: true });
      return;
    }
    if (document.getElementById("unveil-startup-fallback")) return;

    var panel = document.createElement("div");
    panel.id = "unveil-startup-fallback";
    panel.setAttribute("role", "alert");
    panel.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#09070d;color:#f8f4ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;";

    var card = document.createElement("div");
    card.style.cssText = "max-width:420px;width:100%;text-align:center;border:1px solid rgba(216,180,254,.35);border-radius:28px;background:rgba(24,16,32,.96);padding:32px;box-shadow:0 0 80px rgba(168,85,247,.24)";

    var brand = document.createElement("div");
    brand.style.cssText = "font-size:28px;letter-spacing:.28em;margin-bottom:14px";
    brand.textContent = "UNVEIL";

    var title = document.createElement("h1");
    title.style.cssText = "font-size:20px;margin:0 0 10px";
    title.textContent = "UNVEIL could not finish opening";

    var message = document.createElement("p");
    message.style.cssText = "margin:0;color:rgba(248,244,255,.72);line-height:1.5";
    message.textContent = asText(reason);

    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px";

    var retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.style.cssText = "border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#8b5cf6,#ec4899,#f59e0b);color:white;font-weight:700";
    retry.addEventListener("click", function () { window.location.reload(); });

    var home = document.createElement("button");
    home.type = "button";
    home.textContent = "Home";
    home.style.cssText = "border:1px solid rgba(216,180,254,.35);border-radius:999px;padding:12px 18px;background:rgba(255,255,255,.06);color:#f8f4ff;font-weight:700";
    home.addEventListener("click", function () { window.location.href = "/"; });

    actions.appendChild(retry);
    actions.appendChild(home);
    card.appendChild(brand);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(actions);
    panel.appendChild(card);
    document.body.appendChild(panel);
  }

  function persist(entry) {
    try {
      var stored = JSON.parse(window.localStorage.getItem("unveil:startup-errors") || "[]");
      stored.push(entry);
      window.localStorage.setItem("unveil:startup-errors", JSON.stringify(stored.slice(-20)));
    } catch (_) {}
  }

  function record(entry) {
    errors.push(entry);
    persist(entry);
    try { console.error("[startup:captured]", entry); } catch (_) {}
  }

  window.addEventListener("error", function (event) {
    var target = event.target;
    var asset = target && target !== window ? (target.src || target.href || target.currentSrc) : "";
    var entry = { type: "error", message: event.message || asset || "Asset failed to load", source: event.filename || asset || "unknown", at: Date.now() };
    record(entry);
    if ((target && target.tagName === "SCRIPT") || event.error) showFallback(entry.message);
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var entry = { type: "unhandledrejection", message: asText(event.reason), at: Date.now() };
    record(entry);
    showFallback(entry.message);
  });

  window.setTimeout(function () {
    if (document.documentElement.getAttribute("data-unveil-ready") !== "1") {
      showFallback("Startup took longer than expected. Please retry.");
    }
  }, 12000);
})();
