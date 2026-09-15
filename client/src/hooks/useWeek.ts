import { useEffect, useState } from "react";
import type { WeekView } from "../lib/types";

const cache = new Map<string, WeekView>();
const inFlight = new Map<string, Promise<WeekView>>();

function key(seasonType: number, week: number): string {
  return `${seasonType}:${week}`;
}

async function load(seasonType: number, week: number): Promise<WeekView> {
  const id = key(seasonType, week);
  const cached = cache.get(id);
  if (cached) return cached;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const request = fetch(`/api/week/${seasonType}/${week}`)
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
export function prefetchWeek(seasonType: number, week: number): void {
  void load(seasonType, week).catch(() => undefined);
}

interface WeekState {
  view: WeekView | null;
  loading: boolean;
  error: boolean;
}

export function useWeek(seasonType: number, week: number): WeekState {
  const [loaded, setLoaded] = useState<{
    id: string;
    view: WeekView | null;
    error: boolean;
  } | null>(() => {
    const cached = cache.get(key(seasonType, week));
    return cached
      ? { id: key(seasonType, week), view: cached, error: false }
      : null;
  });

  useEffect(() => {
    let cancelled = false;
    const id = key(seasonType, week);

    load(seasonType, week)
      .then((view) => {
        if (!cancelled) setLoaded({ id, view, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, view: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [seasonType, week]);

  const current = loaded && loaded.id === key(seasonType, week) ? loaded : null;
  return {
    view: current?.view ?? null,
    loading: current === null,
    error: current?.error ?? false,
  };
}
