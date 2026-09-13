import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Both conferences fit side by side from here up. Must match the `xl:` grid in
 * App — below it, hiding the conference switch would strand one conference
 * with no way to reach it.
 */
export const DESKTOP_QUERY = "(min-width: 1280px)";
