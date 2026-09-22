/**
 * Holds the page still behind a dialog without moving it.
 *
 * This used to pin the body — `position: fixed` at `top: -scrollY`, restored on
 * close — because `overflow: hidden` didn't stop touch scrolling on iOS. That
 * was fixed in WebKit in 2021 (bug 153852), and its last loophole, a page that
 * still scrolled once Safari's toolbar had collapsed, in Safari 26.4 (bug
 * 240859). Pinning had a real cost: the body changing position moves every
 * layer on the page, so on WebKit the whole visible page was re-laid out and
 * repainted on open, and again on close, before the dialog could appear or
 * leave. Setting `overflow` moves nothing.
 *
 * It has to go on the body, not on <html>. The body's own `overflow-x: hidden`
 * (index.css) is normally handed to the viewport, leaving the body an ordinary
 * box. Give <html> an overflow and the viewport takes that instead — the body
 * keeps its own and becomes a scroll container of its own, wrapping the whole
 * page: the sticky bar then sticks to a box that never scrolls and jumps out
 * of place, and WebKit rebuilds the entire page into a new scrolling layer,
 * which is the repaint this exists to avoid. On the body, the value passes
 * straight through to the viewport.
 *
 * Callers pair this with `touch-action: none` on their overlay, so a drag that
 * starts anywhere but the dialog's own scroller has nothing to pan — the lock
 * holds even where a browser's `overflow` handling doesn't.
 */
export function lockScroll(): () => void {
  const { body } = document;
  const previous = body.style.overflow;
  body.style.overflow = "hidden";
  return () => {
    body.style.overflow = previous;
  };
}
