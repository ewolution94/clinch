/**
 * Reader preferences, stored locally.
 *
 * Ported from PLANUM's `lib/settings.ts`, including the part that matters:
 * `normalize()` merges field by field onto the defaults rather than trusting the
 * parsed blob. A corrupted value, or one written by a future build with renamed
 * fields, then costs that one setting rather than every setting at once.
 *
 * Nothing here goes near a server. Clinch has no accounts and this doesn't
 * change that — it's a preference file in the reader's own browser.
 */

/** `creative` is dark with the motion turned up, not a third palette. */
export type Theme = "dark" | "light" | "creative";
export type Lang = "en" | "de";
/** `last` resumes whichever view was open when you left. */
export type Landing = "standings" | "week" | "playoffs" | "bracket" | "last";
export type ConferencePref = "AFC" | "NFC" | "last";
/** `system` defers to prefers-reduced-motion, as the app already did. */
export type Motion = "system" | "full" | "reduced";

export interface Settings {
  theme: Theme;
  lang: Lang;
  landing: Landing;
  conference: ConferencePref;
  motion: Motion;
  /** A team abbreviation, or null for none. Marked everywhere it appears. */
  favourite: string | null;
  /** The week view's "only games on TV" filter, remembered between visits. */
  tvOnly: boolean;
  /** Written when `landing` or `conference` is "last"; never shown directly. */
  lastRoute: Landing | null;
  lastConference: "AFC" | "NFC" | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  lang: "en",
  landing: "standings",
  conference: "AFC",
  motion: "system",
  favourite: null,
  tvOnly: false,
  lastRoute: null,
  lastConference: null,
};

const KEY = "clinch-settings-v1";

const THEMES: Theme[] = ["dark", "light", "creative"];
const LANGS: Lang[] = ["en", "de"];
const LANDINGS: Landing[] = [
  "standings",
  "week",
  "playoffs",
  "bracket",
  "last",
];
const CONFERENCES: ConferencePref[] = ["AFC", "NFC", "last"];
const MOTIONS: Motion[] = ["system", "full", "reduced"];

function one<T extends string>(allowed: T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

function normalize(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    theme: one(THEMES, obj.theme, DEFAULT_SETTINGS.theme),
    lang: one(LANGS, obj.lang, DEFAULT_SETTINGS.lang),
    landing: one(LANDINGS, obj.landing, DEFAULT_SETTINGS.landing),
    conference: one(CONFERENCES, obj.conference, DEFAULT_SETTINGS.conference),
    motion: one(MOTIONS, obj.motion, DEFAULT_SETTINGS.motion),
    // Shape only: an abbreviation that names no team simply never matches.
    favourite:
      typeof obj.favourite === "string" && /^[A-Z]{2,3}$/.test(obj.favourite)
        ? obj.favourite
        : null,
    tvOnly: obj.tvOnly === true,
    lastRoute:
      obj.lastRoute === undefined
        ? null
        : one(LANDINGS, obj.lastRoute, "standings"),
    lastConference:
      obj.lastConference === "AFC" || obj.lastConference === "NFC"
        ? obj.lastConference
        : null,
  };
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    // Private mode, a wiped profile, a half-written value — any of these mean
    // "no preferences", which is a perfectly good state to render.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage full or blocked. The session still works; it just won't persist.
  }
}

/**
 * Applied to the document root, and duplicated by the boot script in index.html
 * so the first paint is already right. Keep the two in step — a mismatch shows
 * up as a flash of the wrong theme, which is exactly what the script is for.
 */
export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.motion = settings.motion;
  root.lang = settings.lang;

  const dark = settings.theme !== "light";
  root.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#05070c" : "#eef2f9");
}
