import { useCallback, useEffect, useState } from "react";

export type Route = "standings" | "playoffs" | "bracket";

const PATHS: Record<Route, string> = {
  standings: "/",
  playoffs: "/playoffs",
  bracket: "/bracket",
};

function readRoute(): Route {
  const path = window.location.pathname;
  if (path.startsWith("/playoffs")) return "playoffs";
  if (path.startsWith("/bracket")) return "bracket";
  return "standings";
}

/**
 * Two views, two real URLs — enough to be linkable and to survive a back
 * gesture, without pulling in a router for one branch.
 */
function readGame(): string | null {
  return new URLSearchParams(window.location.search).get("game");
}

export interface Router {
  route: Route;
  navigate: (next: Route) => void;
  /** The open game's event id, mirrored in `?game=` so back closes it. */
  game: string | null;
  openGame: (id: string) => void;
  closeGame: () => void;
}

export function useRoute(): Router {
  const [route, setRoute] = useState<Route>(readRoute);
  const [game, setGame] = useState<string | null>(readGame);

  useEffect(() => {
    const onPop = () => {
      setRoute(readRoute());
      setGame(readGame());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState({}, "", PATHS[next]);
    setRoute(next);
    setGame(null);
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

  return { route, navigate, game, openGame, closeGame };
}
