import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

/**
 * PWA service worker registration — guarded so it NEVER runs inside the
 * Lovable preview iframe or on a preview host. Service workers there cause
 * stale content + navigation interference.
 */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isInIframe || isPreviewHost) {
  // Defensive cleanup: unregister any leftover service workers in preview contexts.
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
} else {
  // Production: register the auto-generated SW.
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { /* SW unavailable; app still works online-first */ });
}
