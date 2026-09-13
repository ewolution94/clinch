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
export function useRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState({}, "", PATHS[next]);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return [route, navigate];
}
