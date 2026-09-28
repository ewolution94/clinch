import { useCallback, useEffect, useRef, useState } from "react";
import { PATHS, parseRoute, parseTeam, parseWeekSlug } from "../lib/routes";

export type { Route } from "../lib/routes";
import type { Route } from "../lib/routes";

function readRoute(): Route {
  return parseRoute(window.location.pathname);
}

/**
 * Two views, two real URLs — enough to be linkable and to survive a back
 * gesture, without pulling in a router for one branch.
 */
function readGame(): string | null {
  return new URLSearchParams(window.location.search).get("game");
}

/**
 * The archived season being read, if any.
 *
 * It lives in the URL rather than in settings because it is a property of what
 * you are *looking at*, not a preference: a link to the 2023 table should open
 * the 2023 table for whoever you send it to. Anything that isn't a plausible
 * year is ignored rather than passed on — the server only serves the seasons it
 * offers, but there is no reason to ask it about `?season=<script>`.
 */
function readSeason(): number | null {
  const raw = new URLSearchParams(window.location.search).get("season");
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : null;
}

/** Marks a `?game=` history entry this app pushed, as opposed to one it arrived on. */
const GAME_ENTRY = "clinchGame";

function readWeekSlug(): string | null {
  return parseWeekSlug(window.location.pathname);
}

/**
 * In the path rather than in state, for the same reason the week is: a link to
 * the Chiefs' season should open the Chiefs' season for whoever you send it to.
 */
function readTeam(): string | null {
  return parseTeam(window.location.pathname);
}

/**
 * The query string for a given state. The season has to survive every
 * navigation — moving from the standings to the bracket while reading 2023 and
 * silently landing in 2026 would be the worst kind of wrong.
 */
function search(season: number | null, game?: string | null): string {
  const params = new URLSearchParams();
  if (game) params.set("game", game);
  if (season) params.set("season", String(season));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface Router {
  route: Route;
  navigate: (next: Route) => void;
  /** The `/week/<slug>` segment, if any — resolved against the calendar. */
  weekSlug: string | null;
  openWeek: (slug: string) => void;
  /** The `/team/<abbr>` segment, if any. Null means "whatever the reader's is". */
  teamAbbr: string | null;
  openTeam: (abbr: string | null) => void;
  /** The open game's event id, mirrored in `?game=` so back closes it. */
  game: string | null;
  openGame: (id: string) => void;
  closeGame: () => void;
  /** The archived season being read, or null for the live one. */
  season: number | null;
  openSeason: (year: number | null) => void;
}

export function useRoute(): Router {
  const [route, setRoute] = useState<Route>(readRoute);
  const [game, setGame] = useState<string | null>(readGame);
  const [weekSlug, setWeekSlug] = useState<string | null>(readWeekSlug);
  const [teamAbbr, setTeamAbbr] = useState<string | null>(readTeam);
  const [season, setSeason] = useState<number | null>(readSeason);

  /** A `history.back()` from closeGame that hasn't landed yet. */
  const leaving = useRef(false);

  useEffect(() => {
    const onPop = () => {
      leaving.current = false;
      setRoute(readRoute());
      setGame(readGame());
      setWeekSlug(readWeekSlug());
      setTeamAbbr(readTeam());
      setSeason(readSeason());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState({}, "", `${PATHS[next]}${search(readSeason())}`);
    setRoute(next);
    setGame(null);
    setWeekSlug(null);
    // Dropped along with the slug: the tab lands on the reader's own team, the
    // way it lands on the week being played.
    setTeamAbbr(null);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // The modal is a history entry of its own, so the Android back gesture and
  // the browser back button close it instead of leaving the page.
  const openGame = useCallback((id: string) => {
    window.history.pushState(
      { [GAME_ENTRY]: true },
      "",
      `${window.location.pathname}${search(readSeason(), id)}`,
    );
    setGame(id);
  }, []);

  /**
   * Closes *synchronously*, then tidies the URL.
   *
   * It used to close by calling `history.back()` and waiting for `popstate`.
   * That left a shared `?game=` link leaving the site entirely: the entry is
   * the tab's own, not one this app pushed, so "back" went to wherever the
   * reader came from — confirmed as a real `back_forward` navigation. Now the
   * state changes here and the URL follows: our own entry is popped (so the
   * Android back gesture still behaves), and an arrived-on one is rewritten in
   * place.
   */
  const closeGame = useCallback(() => {
    setGame(null);
    if (leaving.current || readGame() === null) return;
    if (
      (window.history.state as Record<string, unknown> | null)?.[GAME_ENTRY]
    ) {
      // Guarded, so a second close before popstate can't step back twice.
      leaving.current = true;
      window.history.back();
    } else {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${search(readSeason())}`,
      );
    }
  }, []);

  // Replaces rather than pushes: stepping through a dozen weeks shouldn't bury
  // the page the reader arrived from under a dozen history entries.
  const openWeek = useCallback((slug: string) => {
    window.history.replaceState(
      {},
      "",
      `/week/${encodeURIComponent(slug)}${search(readSeason())}`,
    );
    setWeekSlug(slug);
    setRoute("week");
  }, []);

  /** Replaces, like the week does: flicking through teams isn't history. */
  const openTeam = useCallback((abbr: string | null) => {
    const path = abbr ? `/team/${encodeURIComponent(abbr)}` : "/team";
    window.history.replaceState({}, "", `${path}${search(readSeason())}`);
    setTeamAbbr(abbr);
    setRoute("team");
  }, []);

  /**
   * Changing season drops the week: `/week/14` of 2023 and of this season are
   * different pages, and the one you were reading may not even exist in the
   * other (a season in progress has no Super Bowl yet). Back to the root view
   * of the season instead, which is always there.
   */
  const openSeason = useCallback(
    (year: number | null) => {
      // The week is dropped because `/week/14` of 2023 and of this season are
      // different pages; a team is not — the Chiefs played every one of them.
      const path =
        route === "week" || route === "settings"
          ? PATHS[route]
          : window.location.pathname;
      window.history.pushState({}, "", `${path}${search(year)}`);
      setSeason(year);
      setGame(null);
      if (route === "week") setWeekSlug(null);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [route],
  );

  return {
    route,
    navigate,
    game,
    openGame,
    closeGame,
    weekSlug,
    openWeek,
    teamAbbr,
    openTeam,
    season,
    openSeason,
  };
}
