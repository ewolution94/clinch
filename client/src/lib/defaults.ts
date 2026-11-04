/**
 * The order a family setting is decided in (Dashboard, plans/dashboard.md in
 * the workspace): this device's own choice, then Dashboard's value (one set for
 * Clinch, or the family's motion), then the built-in one, which is today's:
 * dark, English, the device's own motion setting. Dashboard's `system` means
 * no default, so it lands on the built-in one too.
 *
 * The values come from `#ewo-config`, which the server puts first in <head>;
 * without it (the dev server, Dashboard off or down) every one is built-in.
 * The pre-paint script in index.html does the same for the first paint; keep
 * the two in step. No React and no DOM here, so the tests load it as it is.
 */
import type { Lang, Motion, Settings, Theme } from "./settings";

/** What the page shows: the theme, the language and the motion, each settled. */
export interface Shown {
  theme: Theme;
  lang: Lang;
  motion: Motion;
}

/** The device's theme, else Dashboard's light or dark, else the built-in dark. */
export const themeFor = (own: Settings["theme"], dashboard: unknown): Theme =>
  own !== "default" ? own : dashboard === "light" ? "light" : "dark";

/** The device's language, else Dashboard's, else the built-in English. */
export const langFor = (own: Settings["lang"], dashboard: unknown): Lang =>
  own !== "default" ? own : dashboard === "de" ? "de" : "en";

/**
 * The device's motion, else Dashboard's (its `less` is Clinch's `reduced`),
 * else `system`: the device's reduce-motion setting, as before.
 */
export const motionFor = (own: Motion, dashboard: unknown): Motion =>
  own !== "system" ? own : dashboard === "less" ? "reduced" : dashboard === "full" ? "full" : "system";

export function shownFor(
  settings: Pick<Settings, "theme" | "lang" | "motion">,
  dashboard: Readonly<Record<string, unknown>>,
): Shown {
  return {
    theme: themeFor(settings.theme, dashboard.theme),
    lang: langFor(settings.lang, dashboard.lang),
    motion: motionFor(settings.motion, dashboard.motion),
  };
}
