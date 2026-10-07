import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { loadCensus } from "./lib/census";

function start() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Clinch never rewrites the address on load, so the first path is already the visit's.
  loadCensus();
}

// Installed, the app opens on the splash screen (index.html; written by
// development/plans/splash-rollout). iOS fades its launch image into the page as
// soon as the page has laid out, so the splash has to be on screen before the
// app's first render takes the main thread, or the fade goes through a blank
// white web view. App lifts it (splash:ready).
if (document.documentElement.classList.contains("splash")) {
  let started = false;
  const once = () => {
    if (started) return;
    started = true;
    start();
  };
  requestAnimationFrame(() => setTimeout(once));
  setTimeout(once, 100);
} else {
  start();
}

/**
 * The offline shell — see `public/sw.js` for what it does and doesn't cache.
 *
 * Production only, and deliberately: a service worker in front of the dev
 * server caches the very modules Vite is trying to hot-replace. Registered
 * after `load` so it competes with nothing on the first paint, which is the
 * paint this exists to make faster on every visit after it.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unavailable worker costs the offline shell and nothing else.
    });
  });
}
