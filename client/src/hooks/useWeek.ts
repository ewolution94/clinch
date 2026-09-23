import { useEffect, useState } from "react";
import { weekUrl } from "../lib/api";
import type { WeekView } from "../lib/types";

const cache = new Map<string, WeekView>();
const inFlight = new Map<string, Promise<WeekView>>();

function key(seasonType: number, week: number, season: number | null): string {
  return `${season ?? "live"}:${seasonType}:${week}`;
}

async function load(seasonType: number, week: number, season: number | null): Promise<WeekView> {
  const id = key(seasonType, week, season);
  const cached = cache.get(id);
  if (cached) return cached;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const request = fetch(weekUrl(seasonType, week, season))
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const view = (await res.json()) as WeekView;
      // A settled week is frozen upstream too, so it can be held indefinitely.
      // Anything else is dropped so a revisit re-reads it.
      if (view.settled) cache.set(id, view);
      return view;
    })
    .finally(() => inFlight.delete(id));

  inFlight.set(id, request);
  return request;
}

/** Warms a week without rendering it, so the arrows feel instant. */
export function prefetchWeek(seasonType: number, week: number, season: number | null): void {
  void load(seasonType, week, season).catch(() => undefined);
}

interface WeekState {
  view: WeekView | null;
  loading: boolean;
  error: boolean;
}

export function useWeek(
  seasonType: number,
  week: number,
  season: number | null,
): WeekState {
  const [loaded, setLoaded] = useState<{
    id: string;
    view: WeekView | null;
    error: boolean;
  } | null>(() => {
    const cached = cache.get(key(seasonType, week, season));
    return cached
      ? { id: key(seasonType, week, season), view: cached, error: false }
      : null;
  });

  useEffect(() => {
    let cancelled = false;
    const id = key(seasonType, week, season);

    load(seasonType, week, season)
      .then((view) => {
        if (!cancelled) setLoaded({ id, view, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, view: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [seasonType, week, season]);

  const current =
    loaded && loaded.id === key(seasonType, week, season) ? loaded : null;
  return {
    view: current?.view ?? null,
    loading: current === null,
    error: current?.error ?? false,
  };
}
