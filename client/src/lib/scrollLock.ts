/**
 * Holds the page still behind a dialog without moving it.
 *
 * ⚠️ The lock goes on `<html>`, not on `<body>`, and getting that backwards is
 * how it silently stopped working once already.
 *
 * CSS hands the *viewport's* overflow to the root element. There is one
 * exception: when `<html>`'s overflow is `visible` in **both** axes, the
 * viewport takes `<body>`'s values instead. This used to lock the body for
 * exactly that reason — and then a later fix for horizontal panning gave
 * `<html>` an `overflow-x: clip` (see index.css). That one line took `<html>`
 * out of `visible`, so the exception stopped applying, the viewport went back
 * to following `<html>`, and `body { overflow: hidden }` became a no-op that
 * clipped nothing and locked nothing. Nobody noticed, because
 * `touch-action: none` on the dialog still caught most drags — it only leaked
 * when a drag began inside the dialog's own scroller, which is why it presented
 * as "sometimes the background scrolls".
 *
 * Measured in the page, at 390px, scrolled to 600:
 *   - `body { overflow: hidden }`  → a wheel scroll moved the page to 600. Not locked.
 *   - `html { overflow: hidden }`  → held at 600 across eight scroll ticks.
 *     Scroll position preserved, `.clinch-bar` still at top 0, `clientWidth`
 *     unchanged, so nothing jumps on open or close.
 *
 * `hidden` and not `clip`: `clip` leaves no scroll container at all, which
 * throws the scroll position away — the page would be back at the top when the
 * dialog closed. `hidden` stops the user scrolling while keeping the position.
 * Restoring the inline style (rather than setting a value) hands `overflow-x`
 * back to the stylesheet's `clip`, so the panning fix returns intact.
 *
 * It does not pin the body — `position: fixed` at `top: -scrollY`, the old
 * trick — because moving the body relayouts and repaints every layer on the
 * page, twice per dialog. Setting overflow moves nothing.
 *
 * Hiding the overflow also takes the scrollbar away, and on a classic
 * scrollbar that hands its width back to the page: measured at 1280, the
 * document went 1270 → 1280 and everything jumped 10px sideways on open, and
 * back again on close. So the gutter is replaced with padding for as long as
 * the lock is held. `scrollbar-gutter: stable` is the tidier answer on paper
 * and was tried first — Chromium computes it but does not honour it on the
 * root element under `overflow: hidden`, measured as the same 10px jump. Where
 * scrollbars are overlays (macOS, iOS) the gap is 0 and none of this runs.
 *
 * Callers still pair this with `touch-action: none` on their overlay. That is
 * belt and braces now rather than the thing doing the work.
 */

/** Nested locks, so an overlapping pair can't strand the page either way. */
let depth = 0;
let overflow = "";
let paddingRight = "";

export function lockScroll(): () => void {
  const root = document.documentElement;
  if (depth === 0) {
    overflow = root.style.overflow;
    paddingRight = root.style.paddingRight;

    // Measure before hiding: afterwards the scrollbar is already gone.
    const gutter = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (gutter > 0) root.style.paddingRight = `${gutter}px`;
  }
  depth += 1;

  let released = false;
  return () => {
    // Guarded: a caller unlocking twice must not cancel somebody else's lock.
    if (released) return;
    released = true;
    depth -= 1;
    if (depth > 0) return;
    root.style.overflow = overflow;
    root.style.paddingRight = paddingRight;
  };
}
