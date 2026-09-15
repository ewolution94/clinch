import { useCallback, useEffect, useState } from "react";

export type Route = "standings" | "playoffs" | "bracket" | "week";

const PATHS: Record<Route, string> = {
  standings: "/",
  playoffs: "/playoffs",
  bracket: "/bracket",
  week: "/week",
};

function readRoute(): Route {
  const path = window.location.pathname;
  if (path.startsWith("/playoffs")) return "playoffs";
  if (path.startsWith("/bracket")) return "bracket";
  if (path.startsWith("/week")) return "week";
  return "standings";
}

/**
 * Two views, two real URLs — enough to be linkable and to survive a back
 * gesture, without pulling in a router for one branch.
 */
function readGame(): string | null {
  return new URLSearchParams(window.location.search).get("game");
}

function readWeekSlug(): string | null {
  const match = /^\/week\/([^/?#]+)/.exec(window.location.pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export interface Router {
  route: Route;
  navigate: (next: Route) => void;
  /** The `/week/<slug>` segment, if any — resolved against the calendar. */
  weekSlug: string | null;
  openWeek: (slug: string) => void;
  /** The open game's event id, mirrored in `?game=` so back closes it. */
  game: string | null;
  openGame: (id: string) => void;
  closeGame: () => void;
}

export function useRoute(): Router {
  const [route, setRoute] = useState<Route>(readRoute);
  const [game, setGame] = useState<string | null>(readGame);
  const [weekSlug, setWeekSlug] = useState<string | null>(readWeekSlug);

  useEffect(() => {
    const onPop = () => {
      setRoute(readRoute());
      setGame(readGame());
      setWeekSlug(readWeekSlug());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState({}, "", PATHS[next]);
    setRoute(next);
    setGame(null);
    setWeekSlug(null);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // The modal is a history entry of its own, so the Android back gesture and
  // the browser back button close it instead of leaving the page.
  const openGame = useCallback((id: string) => {
    window.history.pushState({}, "", `${window.location.pathname}?game=${id}`);
    setGame(id);
  }, []);

  const closeGame = useCallback(() => {
    if (readGame()) window.history.back();
    else setGame(null);
  }, []);

  // Replaces rather than pushes: stepping through a dozen weeks shouldn't bury
  // the page the reader arrived from under a dozen history entries.
  const openWeek = useCallback((slug: string) => {
    window.history.replaceState({}, "", `/week/${encodeURIComponent(slug)}`);
    setWeekSlug(slug);
    setRoute("week");
  }, []);

  return { route, navigate, game, openGame, closeGame, weekSlug, openWeek };
}
