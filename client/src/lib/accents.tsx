import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Snapshot } from "./types";

const AccentContext = createContext<ReadonlyMap<string, string>>(new Map());

/**
 * Team colours, reachable from anywhere that draws a mark.
 *
 * This exists so a chip can never render without its team's colour just because
 * whoever placed it didn't have the standings to hand. That was the actual cause
 * of the same team looking like two different things on two screens: the
 * schedule strip and the opponent chips inside an expanded row only ever had an
 * abbreviation, so they fell back to grey while every other chip was coloured.
 * A component that needs one value shouldn't force three layers of props.
 */
export function AccentProvider({
  snapshot,
  children,
}: {
  snapshot: Snapshot | null;
  children: ReactNode;
}) {
  const accents = useMemo(() => {
    const map = new Map<string, string>();
    for (const conference of snapshot?.conferences ?? []) {
      for (const team of conference.seeds) map.set(team.abbr, team.accent);
    }
    return map;
  }, [snapshot]);

  return (
    <AccentContext.Provider value={accents}>{children}</AccentContext.Provider>
  );
}

/** The team's accent, or undefined before the first snapshot arrives. */
export function useAccent(abbr: string): string | undefined {
  return useContext(AccentContext).get(abbr);
}
