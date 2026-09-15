import type { Snapshot, TeamEntry } from "./types";

/**
 * Every team in the snapshot, keyed by abbreviation.
 *
 * The scoreboard only ever carries abbreviations, so anything that needs a
 * team's colour or record has to join back to the standings. Shared so the
 * schedule strip and the week view build the same map the same way — the strip
 * used to have no access to accents at all, which is why its marks were the one
 * place in the app rendering without a chip.
 */
export function teamMap(snapshot: Snapshot): Map<string, TeamEntry> {
  const map = new Map<string, TeamEntry>();
  for (const conference of snapshot.conferences) {
    for (const team of conference.seeds) map.set(team.abbr, team);
  }
  return map;
}
