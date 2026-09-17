import { useEffect } from "react";

/**
 * Escape, scroll lock, `inert` on the app shell, and focus returned on close.
 *
 * Intentionally separate from `GameModal`, which does all of this too. That
 * component also carries a view-transition morph, and the handover records four
 * distinct bugs paid for in getting it right — the top-layer interaction, an
 * opacity on a captured ancestor, a `view-transition-name` leak across cards,
 * the `flushSync` requirement. The settings dialog needs none of that, and
 * refactoring the two together would put the morph at risk to save twenty lines.
 */
export function useDismissable(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const shell = document.getElementById("app-shell");
    shell?.setAttribute("inert", "");

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // `overflow: hidden` alone doesn't hold on iOS — the body has to be pinned.
    const offset = window.scrollY;
    const { body } = document;
    const previous = body.style.cssText;
    body.style.position = "fixed";
    body.style.top = `-${offset}px`;
    body.style.left = "0";
    body.style.right = "0";

    return () => {
      document.removeEventListener("keydown", onKey);
      shell?.removeAttribute("inert");
      body.style.cssText = previous;
      window.scrollTo({ top: offset, behavior: "instant" as ScrollBehavior });
      opener?.focus?.();
    };
  }, [open, onClose]);
}
