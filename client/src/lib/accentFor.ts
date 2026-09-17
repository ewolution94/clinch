import type { Theme } from "./settings";

/**
 * Team accents, adjusted for the theme they're drawn on.
 *
 * `server/src/teams.ts` says it plainly: the 32 accents are hand-picked to be
 * legible on the near-black page. On paper they are the wrong way round —
 * measured, 27 of the 32 fail 4.5:1 against a white card, and Miami's teal, the
 * Raiders' silver and New Orleans' gold are barely visible. They carry small
 * mono labels as well as fills, so this is a legibility problem, not a taste.
 *
 * Each accent is darkened just far enough to clear the bar and no further —
 * scaling the channels preserves the hue, so a dark Dolphins teal still reads as
 * Dolphins teal rather than as generic navy.
 */

/**
 * Contrast against a white card. Small mono labels, so 4.5:1 is the bar — but
 * the target is set above it, because accents are frequently drawn *on* a wash
 * of themselves (the seed markers, the hero's "AFC NO. 1 SEED"). Measured in
 * the page, targeting exactly 4.5 against white left those at 4.1–4.3 on their
 * tinted grounds.
 */
const TARGET_CONTRAST = 5.4;
const LIGHT_GROUND = 1; // relative luminance of #ffffff

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function parse(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

const cache = new Map<string, string>();

/**
 * Only the light theme adjusts anything — dark and creative share a palette, and
 * the accents were chosen for it.
 */
export function accentFor(accent: string, theme: Theme): string {
  if (theme !== "light") return accent;

  const cached = cache.get(accent);
  if (cached) return cached;

  const rgb = parse(accent);
  if (!rgb) return accent;

  const ceiling = (LIGHT_GROUND + 0.05) / TARGET_CONTRAST - 0.05;
  let [r, g, b] = rgb;

  // Scale towards black in small steps rather than solving directly: luminance
  // isn't linear in the channels, and stepping keeps the hue proportions intact.
  for (let i = 0; i < 40 && luminance(r, g, b) > ceiling; i += 1) {
    r *= 0.94;
    g *= 0.94;
    b *= 0.94;
  }

  const result = toHex(r, g, b);
  cache.set(accent, result);
  return result;
}
