import { logoUrl } from "../lib/format";
import { DEFAULT_MARK_WEIGHT, MARK_WEIGHT } from "../lib/markWeight";

interface TeamWatermarkProps {
  abbr: string;
  size: number;
  /**
   * Perceived weight, 0–1 — not the raw alpha. The mark's own measurement is
   * applied on top, so the same number means the same visual strength whichever
   * team it is.
   */
  opacity?: number;
  /** How far the mark bleeds past its edge, in px. */
  bleed?: number;
  /**
   * Which edge it bleeds off. Right by default; `left` exists only for genuinely
   * mirrored layouts — the game dialog puts the away team on the left and the
   * home team on the right, and the marks have to follow the teams. It is not a
   * free choice, which is the point: two positions, both vertically centred.
   */
  side?: "left" | "right";
}

/**
 * The oversized team mark that turns a card into a banner — the real artwork,
 * in its own colours.
 *
 * The thing that made these look broken was never the colour, it was the weight:
 * the 32 marks span ~34x in luminance, so at one fixed opacity the Steelers and
 * Raiders shouted while the Giants were invisible, and every card looked like it
 * had been tuned by hand. So each asset is measured once at author time
 * (`scripts/measure-marks.py` → `lib/markWeight.ts`) and the correction is
 * applied here: `alpha` trims the bright marks back, and `brightness` lifts the
 * three that are essentially black — the Giants, Rams and Panthers — far enough
 * to register at all. Hue and detail are untouched.
 *
 * Placement is owned here, not passed in. A watermark bleeds off one edge, always
 * vertically centred. It used to take a free-form className, and the call sites
 * promptly disagreed with each other: mirrored left on one card, dropped into the
 * bottom-right corner on another, where it sat underneath the score and the form
 * dots.
 *
 * The rule that comes with it: a watermark may only be used where the right side
 * of the card carries no data. In a dense row there is no safe place for one.
 */
export function TeamWatermark({
  abbr,
  size,
  opacity = 0.2,
  bleed = 18,
  side = "right",
}: TeamWatermarkProps) {
  const weight = MARK_WEIGHT[abbr.toUpperCase()] ?? DEFAULT_MARK_WEIGHT;
  const alpha = Math.min(0.55, opacity * weight.alpha);

  return (
    <img
      src={logoUrl(abbr)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none"
      style={{
        [side]: -bleed,
        width: size,
        height: size,
        opacity: alpha,
        filter:
          weight.brightness > 1
            ? `brightness(${weight.brightness})`
            : undefined,
      }}
    />
  );
}
