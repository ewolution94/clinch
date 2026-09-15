import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Lets the stylesheet stand down its fallback entrance where the browser can
// morph the card into the dialog itself.
if (typeof document.startViewTransition === "function") {
  document.documentElement.classList.add("vt");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
