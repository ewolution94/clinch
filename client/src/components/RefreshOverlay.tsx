import { useEffect } from "react";
import { ClinchMark } from "./ClinchMark";
import { useStrings } from "../lib/useSettings";

/**
 * What a refresh looks like while it happens.
 *
 * The page behind goes soft and still, the mark comes forward inside a turning
 * ring, and the whole thing is gone again in about a second. It exists because
 * the request itself is usually too quick to see: without something deliberate
 * on screen, pressing refresh on an already-current page looks exactly like
 * pressing a dead button.
 *
 * Three things keep it from being annoying:
 *
 *  - **It is only ever for the button.** Coming back to a backgrounded app
 *    refreshes too, and blurring the page every time you switch back would be
 *    intolerable — that path asks for a silent one.
 *  - **It is held open for a moment**, so a fast answer still reads as an
 *    answer rather than as a flicker. That timing lives with the action, in
 *    `useSnapshot` — which is also why this component holds no state of its
 *    own and simply renders what it is told.
 *  - **Nothing moves behind it.** `data-overlay` on the root pauses the ambient
 *    motion, because animating anything underneath a `backdrop-filter` means
 *    recomputing the blur every frame — the measured cause of this app's worst
 *    idle cost (see docs/DECISIONS.md).
 *
 * It is `role="status"`, not a dialog: there is nothing here to interact with,
 * nothing to focus, and it leaves on its own.
 */
export function RefreshOverlay({
  active,
  fading,
}: {
  active: boolean;
  fading: boolean;
}) {
  const t = useStrings();
  const shown = active || fading;

  useEffect(() => {
    if (!shown) return;
    const root = document.documentElement;
    root.dataset.overlay = "";
    return () => {
      delete root.dataset.overlay;
    };
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      className="refresh-veil"
      data-leaving={active ? undefined : ""}
      role="status"
      aria-live="polite"
    >
      <div className="refresh-badge">
        <svg className="refresh-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="refresh-ring__track" cx="32" cy="32" r="28" />
          <circle className="refresh-ring__arc" cx="32" cy="32" r="28" />
        </svg>
        <ClinchMark size={30} />
      </div>
      <span className="refresh-label">{t.refreshing}</span>
    </div>
  );
}
