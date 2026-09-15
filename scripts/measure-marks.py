#!/usr/bin/env python3
"""
Regenerates client/src/lib/markWeight.ts from the logo assets.

Only needed when a logo file changes — a rebrand, a relocation, a re-export at a
different size. Requires Pillow (`pip install pillow`).

    python3 scripts/measure-marks.py

Why this exists: drawn as a watermark at one fixed opacity, the 32 marks look
wildly uneven — the Steelers and Titans shout, the Panthers and Jets disappear.
Measuring each asset once, at author time, lets the watermark hold every team at
the same visual weight while still drawing the real artwork in its own colours.

The measure is "ink": how much of its tile a mark actually fills, as
`mean sRGB value x sqrt(coverage)`.

Relative luminance was the obvious choice and it is the wrong one here. It
weights blue at 0.07, so the Giants' solid navy scores 0.019 — 34x below the
Steelers — and correcting by that much turned the mark into a vivid blue slab
that dominated its card. Mean sRGB tracks how present a colour looks far better
for this, and the coverage term separates a big solid shape from a thin outline
of the same colour. Under "ink" the faintest marks are the Panthers and Jets,
which matches what you actually see.
"""
from PIL import Image
import glob
import os
import sys

TARGET_INK = 0.25          # roughly the league median
MAX_BRIGHTNESS = 1.7       # kept gentle: this is artwork, not a silhouette
MIN_ALPHA_MUL, MAX_ALPHA_MUL = 0.5, 1.9
BRIGHTNESS_EXP, ALPHA_EXP = 0.35, 0.8

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LOGOS = os.path.join(ROOT, "client", "public", "logos", "*.webp")
OUT = os.path.join(ROOT, "client", "src", "lib", "markWeight.ts")


def ink(path: str) -> float:
    """How much of its tile the mark fills, 0–1."""
    image = Image.open(path).convert("RGBA")
    pixels = list(image.getdata())
    opaque = [(r, g, b) for r, g, b, a in pixels if a > 140]
    if not opaque:
        raise SystemExit(f"{path} has no opaque pixels")
    mean = sum((r + g + b) / 3 for r, g, b in opaque) / len(opaque) / 255
    coverage = len(opaque) / len(pixels)
    return mean * (coverage ** 0.5)


def clamp(value: float, low: float, high: float) -> float:
    return min(high, max(low, value))


def main() -> None:
    paths = sorted(glob.glob(LOGOS))
    if not paths:
        raise SystemExit(f"no logos found at {LOGOS}")

    rows = []
    for path in paths:
        abbr = os.path.basename(path)[:-5].upper()
        value = ink(path)
        brightness = clamp((TARGET_INK / value) ** BRIGHTNESS_EXP, 1.0, MAX_BRIGHTNESS)
        alpha = clamp(
            (TARGET_INK / (value * brightness)) ** ALPHA_EXP,
            MIN_ALPHA_MUL,
            MAX_ALPHA_MUL,
        )
        rows.append((abbr, value, brightness, alpha, value * brightness * alpha))

    perceived = [r[4] for r in rows]
    spread = max(perceived) / min(perceived)
    raw = max(r[1] for r in rows) / min(r[1] for r in rows)

    body = "\n".join(
        f"  {abbr}: {{ brightness: {b:.2f}, alpha: {a:.2f} }},"
        for abbr, _, b, a, _ in sorted(rows)
    )

    with open(OUT, "w", encoding="utf-8") as handle:
        handle.write(
            f'''/**
 * Per-mark watermark weight. GENERATED — do not edit by hand.
 *
 *     python3 scripts/measure-marks.py
 *
 * Drawn at one fixed opacity the 32 marks differ by {raw:.1f}x in how much of their
 * tile they fill, so the Steelers shout and the Panthers vanish. Each asset is
 * measured once and corrected here: `alpha` trims the heavy marks back, and
 * `brightness` gives the faintest a gentle lift. Both stay mild on purpose —
 * this is the real artwork, in its own colours, not a silhouette.
 *
 * Measured spread after correction: {spread:.2f}x. See scripts/measure-marks.py
 * for why the measure is "ink" rather than relative luminance.
 */
export interface MarkWeight {{
  /** CSS brightness() multiplier. 1 leaves the artwork untouched. */
  brightness: number;
  /** Multiplier on the context's requested opacity. */
  alpha: number;
}}

export const MARK_WEIGHT: Record<string, MarkWeight> = {{
{body}
}};

/** Teams we have no measurement for fall back to the artwork as authored. */
export const DEFAULT_MARK_WEIGHT: MarkWeight = {{ brightness: 1, alpha: 1 }};
'''
        )

    print(f"wrote {OUT}")
    print(f"  {len(rows)} marks | ink spread {raw:.1f}x -> perceived {spread:.2f}x")
    faint = min(rows, key=lambda r: r[4])
    heavy = max(rows, key=lambda r: r[4])
    print(f"  faintest {faint[0]} {faint[4]:.3f} | heaviest {heavy[0]} {heavy[4]:.3f}")
    print(f"  max brightness applied: {max(r[2] for r in rows):.2f}")


if __name__ == "__main__":
    sys.exit(main())
