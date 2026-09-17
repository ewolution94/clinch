import { accentFor } from "./accentFor";
import type { Theme } from "./settings";
import type { Snapshot, TeamEntry } from "./types";

/**
 * The snapshot with every team's accent adjusted for the current theme.
 *
 * Rewriting the data once is what keeps this from becoming a 35-site change:
 * components read `team.accent` all over the app — in gradients, rings, edge
 * bars, labels — and every one of those reads gets the themed value without
 * knowing a theme exists. The alternative was routing all 35 through a hook,
 * which is more code and leaves the next one free to forget.
 *
 * A no-op on dark and creative, which share the palette the accents were
 * picked for, so the common case allocates nothing.
 */
export function themedSnapshot(snapshot: Snapshot, theme: Theme): Snapshot {
  if (theme !== "light") return snapshot;

  const team = (t: TeamEntry): TeamEntry => ({
    ...t,
    accent: accentFor(t.accent, theme),
  });

  return {
    ...snapshot,
    conferences: snapshot.conferences.map((conference) => ({
      ...conference,
      seeds: conference.seeds.map(team),
      divisions: conference.divisions.map((division) => ({
        ...division,
        teams: division.teams.map(team),
      })),
    })),
  };
}
