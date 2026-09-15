import { useEffect, useState, type RefObject } from "react";

export interface OverflowEdges {
  /** Content is hidden off the left edge. */
  start: boolean;
  /** Content is hidden off the right edge. */
  end: boolean;
}

/** Sub-pixel remainders aren't content; below this, nothing is really hidden. */
const SLACK = 2;

/**
 * Tracks which side of a horizontal scroller actually has content hidden.
 *
 * This is what makes an edge fade honest: a static mask dims the first and last
 * item whether or not anything is cut off, which reads as a rendering bug when
 * the row isn't scrolling at all. Both edges report false when the container
 * doesn't overflow, so a layout that wraps instead of scrolling needs no
 * breakpoint handling — it simply never asks for a fade.
 */
export function useOverflowEdges(
  ref: RefObject<HTMLElement | null>,
): OverflowEdges {
  const [edges, setEdges] = useState<OverflowEdges>({
    start: false,
    end: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const hidden = element.scrollWidth - element.clientWidth;
      setEdges((previous) => {
        const start = element.scrollLeft > SLACK;
        const end = hidden > SLACK && element.scrollLeft < hidden - SLACK;
        return previous.start === start && previous.end === end
          ? previous
          : { start, end };
      });
    };

    update();
    element.addEventListener("scroll", update, { passive: true });

    // The container resizes on rotate or window resize; its child resizes when
    // the number of games changes. Both change what's hidden.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return edges;
}

/** A mask that fades only the edges with something behind them. */
export function edgeFadeMask(
  edges: OverflowEdges,
  width = 28,
): string | undefined {
  if (!edges.start && !edges.end) return undefined;
  const stops = [
    edges.start ? "transparent 0" : "#000 0",
    edges.start ? `#000 ${width}px` : null,
    edges.end ? `#000 calc(100% - ${width}px)` : null,
    edges.end ? "transparent 100%" : "#000 100%",
  ].filter((stop): stop is string => stop !== null);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
