import { useEffect, useState } from "react";
import { teamScheduleUrl } from "../lib/api";
import type { TeamSchedule } from "../lib/types";

/**
 * One team's season.
 *
 * Held for the session once fetched. A schedule only changes when a game is
 * played, and the week views carry that as it happens — so flicking between
 * teams costs one request each and nothing after that.
 *
 * The answer is worked out during render from the cache and the last thing that
 * arrived; the effect only ever *fetches*. That keeps every `setState` inside a
 * promise callback rather than running synchronously in an effect, which is
 * both the cheaper render and the pattern React asks for.
 */
const cache = new Map<string, TeamSchedule>();

/** Keyed by season as well as team — 2023's Chiefs are not this year's. */
function key(abbr: string, season: number | null): string {
  return season === null ? abbr : `${season}:${abbr}`;
}

interface State {
  schedule: TeamSchedule | null;
  loading: boolean;
  error: boolean;
}

interface Arrived {
  key: string;
  schedule: TeamSchedule | null;
  error: boolean;
}

export function useTeamSchedule(
  abbr: string | null,
  season: number | null,
): State {
  const [arrived, setArrived] = useState<Arrived | null>(null);
  const id = abbr ? key(abbr, season) : null;

  useEffect(() => {
    if (!abbr || !id || cache.has(id)) return;

    let cancelled = false;
    fetch(teamScheduleUrl(abbr, season))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: TeamSchedule) => {
        cache.set(id, data);
        if (!cancelled) setArrived({ key: id, schedule: data, error: false });
      })
      .catch(() => {
        if (!cancelled) setArrived({ key: id, schedule: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [abbr, season, id]);

  if (!id) return { schedule: null, loading: false, error: false };

  const cached = cache.get(id);
  if (cached) return { schedule: cached, loading: false, error: false };
  // Only an answer *for this team, this season* counts; the previous one is
  // not this one.
  if (arrived?.key === id) {
    return { schedule: arrived.schedule, loading: false, error: arrived.error };
  }
  return { schedule: null, loading: true, error: false };
}
