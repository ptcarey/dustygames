import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

/**
 * Auto-update strategy:
 * - In production (real device / published site): register the PWA service worker
 *   with autoUpdate behaviour, periodically poll for a new build, and reload as
 *   soon as one is available. Also runs a fallback check that compares the
 *   current `index.html` against the network copy in case the SW is unavailable.
 * - In the Lovable preview iframe: NEVER register a SW (it causes stale content
 *   and breaks navigation). Defensively unregister any leftover SWs.
 */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isInIframe || isPreviewHost) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
} else {
  // 1) Service worker auto-update (production)
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // A new version is waiting — activate immediately and reload.
        updateSW(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Poll for updates every 60s while the tab is open
        const poll = () => registration.update().catch(() => {});
        setInterval(poll, 60_000);
        // And whenever the user re-focuses the tab
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") poll();
        });
      },
    });
  }).catch(() => { /* SW unavailable; fallback check below still runs */ });

  // 2) Fallback build-version check — works even without a service worker.
  startBuildVersionWatcher();
}

/**
 * Hash the currently-loaded module script URL (Vite emits hashed filenames),
 * then periodically refetch index.html and compare. If the hash changes, a new
 * build has been deployed — reload to pick it up.
 */
function startBuildVersionWatcher() {
  const currentHash = getLoadedBuildHash();
  if (!currentHash) return;

  let reloading = false;
  const check = async () => {
    if (reloading) return;
    try {
      const res = await fetch(`/index.html?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      const latest = extractBuildHash(html);
      if (latest && latest !== currentHash) {
        reloading = true;
        // Hard reload to drop any cached assets and pull the new build.
        window.location.reload();
      }
    } catch { /* offline or transient — try again next tick */ }
  };

  setInterval(check, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

function getLoadedBuildHash(): string | null {
  // Find the first hashed JS module on the page (e.g. /assets/index-AbC123.js)
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
  for (const s of scripts) {
    const m = s.src.match(/\/assets\/[^/?#]+\.js/);
    if (m) return m[0];
  }
  return null;
}

function extractBuildHash(html: string): string | null {
  const m = html.match(/\/assets\/[^"'?#]+\.js/);
  return m ? m[0] : null;
}
