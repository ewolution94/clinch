import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

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
