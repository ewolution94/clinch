import { useEffect, useRef, useState } from "react";
import { SNAPSHOT_URL, STREAM_URL, seasonUrl } from "../lib/api";
import type { ConnectionState, Snapshot } from "../lib/types";

interface Loaded {
  /** Which season this was loaded for — null meaning the live one. */
  season: number | null;
  snapshot: Snapshot | null;
  connection: ConnectionState;
}

/**
 * The last table this browser saw, kept where nothing can take it away.
 *
 * There is a copy in the service worker's cache too, and on paper that is the
 * tidier place for it. In practice the worker is the part of this app we can
 * least see: its caches are the browser's to evict, its lifecycle differs
 * between engines, and every offline bug so far has been a difference between
 * what Chrome does with it and what WebKit does. `localStorage` is synchronous,
 * behaves the same everywhere, and is already how settings survive.
 *
 * So this is the belt and the worker is the braces — and it buys something on
 * top: the table is on screen on the *first* frame of every cold open, before
 * any request has been made, offline or not.
 */
const CACHE_KEY = "clinch-snapshot-v1";

function readCached(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    // Shape check, not trust: a payload from an older build could be missing
    // anything, and half a table is worse than a skeleton.
    return Array.isArray(parsed?.conferences) && parsed.conferences.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCached(snapshot: Snapshot): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Full, blocked, or private mode. The session still works; it just won't
    // have anything to show the next time it opens without a signal.
  }
}

/**
 * The season on screen.
 *
 * For the live one the snapshot arrives over SSE and is pushed again whenever
 * the server re-polls ESPN, so the page never needs a manual refresh; a one-off
 * fetch runs alongside it purely so the first paint doesn't wait on the stream.
 *
 * An archived season is the opposite kind of thing — it is finished, so there
 * is nothing to stream and no reason to hold a connection open for it. One
 * fetch, and the browser is allowed to keep the answer.
 *
 * What is loaded is stored *with* the season it belongs to, and the mismatch is
 * resolved on the way out rather than by clearing state when the season
 * changes. Same result, one render fewer — and no window in which last year's
 * table is sitting under this year's header.
 */
export function useSnapshot(season: number | null): {
  snapshot: Snapshot | null;
  connection: ConnectionState;
} {
  // The live season opens on the last table this browser saw, before a single
  // request has been made. An archived one has nothing cached to show.
  const [loaded, setLoaded] = useState<Loaded>(() => ({
    season,
    snapshot: season === null ? readCached() : null,
    connection: "connecting",
  }));
  const gotStream = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (season !== null) {
      fetch(seasonUrl(season))
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data: Snapshot) => {
          if (!cancelled) setLoaded({ season, snapshot: data, connection: "live" });
        })
        .catch(() => {
          if (!cancelled) setLoaded({ season, snapshot: null, connection: "offline" });
        });
      return () => {
        cancelled = true;
      };
    }

    gotStream.current = false;
    fetch(SNAPSHOT_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snapshot | null) => {
        if (cancelled || !data || gotStream.current) return;
        setLoaded((current) => ({ ...current, season: null, snapshot: data }));
        writeCached(data);
      })
      .catch(() => undefined);

    const source = new EventSource(STREAM_URL);
    let stored = false;
    source.onmessage = (event) => {
      gotStream.current = true;
      const snapshot = JSON.parse(event.data) as Snapshot;
      setLoaded({ season: null, snapshot, connection: "live" });
      // Once per session on arrival, then again on the way out. Writing every
      // push would put ~90 kB through localStorage every 25 seconds on a game
      // day, and the only copy that matters is the last one.
      if (!stored) {
        stored = true;
        writeCached(snapshot);
      }
    };
    source.onopen = () =>
      setLoaded((current) => ({ ...current, connection: "live" }));
    source.onerror = () =>
      setLoaded((current) => ({
        ...current,
        connection: "offline",
        // Whatever is on screen came from the last visit, so say so — the page
        // already has a banner for exactly this.
        snapshot: current.snapshot ? { ...current.snapshot, stale: true } : null,
      }));

    return () => {
      cancelled = true;
      source.close();
    };
  }, [season]);

  /*
   * Hand over what is on screen when the app goes away — to storage, and to the
   * service worker's own cache.
   *
   * Live scores arrive over SSE, which the worker never sees, so its copy would
   * otherwise be whatever the last page *load* fetched: an app left open
   * through a Sunday would still show the 19:00 table on Tuesday. Doing it on
   * the way out rather than on every push keeps a game day from writing ~90 kB
   * every 25 seconds for a copy nobody reads.
   */
  const latest = useRef<Snapshot | null>(null);
  useEffect(() => {
    latest.current = season === null ? loaded.snapshot : null;
  }, [loaded.snapshot, season]);

  useEffect(() => {
    if (season !== null) return;
    const remember = () => {
      if (document.visibilityState !== "hidden" || !latest.current) return;
      writeCached(latest.current);
      navigator.serviceWorker?.controller?.postMessage({
        type: "snapshot",
        body: JSON.stringify(latest.current),
      });
    };
    document.addEventListener("visibilitychange", remember);
    return () => document.removeEventListener("visibilitychange", remember);
  }, [season]);

  // A snapshot loaded for another season is not an answer to this one.
  if (loaded.season !== season) return { snapshot: null, connection: "connecting" };
  return { snapshot: loaded.snapshot, connection: loaded.connection };
}
