/**
 * Reading a URL path into a view.
 *
 * Pure, and separate from `useRoute` for one reason: these are the only lines
 * in the app that decide what a shared link means, and they are worth a test
 * each. `useRoute` does the browser half — history, popstate, scroll — and
 * calls these for the parsing.
 */

export type Route =
  | "standings"
  | "playoffs"
  | "bracket"
  | "week"
  | "team"
  | "settings";

/** The path each view lives at. `/week` and `/team` take a segment as well. */
export const PATHS: Record<Route, string> = {
  standings: "/",
  playoffs: "/playoffs",
  bracket: "/bracket",
  week: "/week",
  team: "/team",
  settings: "/settings",
};

/**
 * Anything unrecognised is the standings, deliberately: an old link, a typo or
 * a path some future build stops serving should land somewhere real rather
 * than on a blank page.
 */
export function parseRoute(pathname: string): Route {
  if (pathname.startsWith("/playoffs")) return "playoffs";
  if (pathname.startsWith("/bracket")) return "bracket";
  if (pathname.startsWith("/week")) return "week";
  if (pathname.startsWith("/team")) return "team";
  if (pathname.startsWith("/settings")) return "settings";
  return "standings";
}

/** The `/week/<slug>` segment, if any — resolved against the calendar later. */
export function parseWeekSlug(pathname: string): string | null {
  const match = /^\/week\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The team whose season is open, from `/team/<abbr>`.
 *
 * Shape only, and upper-cased — an abbreviation that names no team simply
 * never matches a row, so there is nothing to validate against here. Null for
 * a bare `/team`, which is the reader asking for their own team rather than a
 * named one.
 */
export function parseTeam(pathname: string): string | null {
  const match = /^\/team\/([A-Za-z]{2,4})(?:[/?#]|$)/.exec(pathname);
  return match ? match[1].toUpperCase() : null;
}
