import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { lockScroll } from "./scrollLock";

/** Everything Tab can land on inside a dialog. Shared with GameModal's trap. */
export const FOCUSABLE =
  'button:not([disabled]), [href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Escape, a focus trap, scroll lock, and focus returned on close.
 *
 * **Deliberately no `inert` on the app shell.** That was the first version, and
 * it was the freeze Eric felt on his phone: making the whole app inert restyles
 * every one of its ~1,600 nodes, measured at 19–452ms of main-thread work on a
 * desktop CPU (heaviest on the first open of a page load) — several times that
 * on a phone. An `aria-hidden` control on the same subtree cost 0.2ms, so it is
 * the style/interactivity work, not the accessibility tree. The dialog doesn't
 * need it: the scrim is a full-screen button, so pointers can't reach the page;
 * Tab is trapped here; and `aria-modal` tells assistive tech the rest. Same
 * guarantees, none of the cost.
 *
 * `GameModal` dropped `inert` too, for the same reason, and has its own trap —
 * the two stay separate because of that component's view-transition machinery.
 *
 * `onClose` is read through a ref so the effect depends on `open` alone. It
 * used to be a dependency, and App passes an inline arrow, so every re-render
 * while the dialog was open — i.e. every setting tapped — tore the whole lock
 * down and rebuilt it: scroll restored, the gear behind the sheet refocused,
 * the body pinned again.
 */
export function useDismissable(
  open: boolean,
  onClose: () => void,
  panel: RefObject<HTMLElement | null>,
): void {
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const node = panel.current;
    const focusables = () =>
      node ? [...node.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];

    // Ambient motion underneath is invisible behind the scrim but still costs
    // the phone a composite every frame; index.css pauses it on this flag.
    root.dataset.overlay = "";

    focusables()[0]?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // The page never moves, so there is no scroll position to put back.
    const unlock = lockScroll();

    return () => {
      document.removeEventListener("keydown", onKey);
      delete root.dataset.overlay;
      unlock();
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, panel]);
}
