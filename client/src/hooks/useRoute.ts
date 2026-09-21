import { useCallback, useEffect, useRef, useState } from "react";

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

/** Marks a `?game=` history entry this app pushed, as opposed to one it arrived on. */
const GAME_ENTRY = "clinchGame";

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

  /** A `history.back()` from closeGame that hasn't landed yet. */
  const leaving = useRef(false);

  useEffect(() => {
    const onPop = () => {
      leaving.current = false;
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
    window.history.pushState(
      { [GAME_ENTRY]: true },
      "",
      `${window.location.pathname}?game=${id}`,
    );
    setGame(id);
  }, []);

  /**
   * Closes *synchronously*, then tidies the URL. It used to close by calling
   * `history.back()` and waiting for `popstate`, which broke two things:
   *
   * - **The closing morph never ran.** `back()` is asynchronous, so when App
   *   calls this inside the view-transition callback nothing has changed yet.
   *   The browser captured the dialog as its own "after" state and morphed it
   *   into itself, and the dialog vanished a moment later. Measured in headless
   *   Chrome: at capture, the panel was still in the DOM holding the name.
   * - **Closing a shared `?game=` link left the site.** That entry is the tab's
   *   own, not one this app pushed, so "back" went to wherever the reader came
   *   from. Confirmed as a real `back_forward` navigation.
   *
   * Now the state changes here, inside the transition, and the URL follows: our
   * own entry is popped (so the Android back gesture still behaves), and an
   * arrived-on one is rewritten in place.
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
      window.history.replaceState(null, "", window.location.pathname);
    }
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
