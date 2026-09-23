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
  const [loaded, setLoaded] = useState<Loaded>({
    season,
    snapshot: null,
    connection: "connecting",
  });
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
      })
      .catch(() => undefined);

    const source = new EventSource(STREAM_URL);
    source.onmessage = (event) => {
      gotStream.current = true;
      setLoaded({
        season: null,
        snapshot: JSON.parse(event.data) as Snapshot,
        connection: "live",
      });
    };
    source.onopen = () =>
      setLoaded((current) => ({ ...current, connection: "live" }));
    source.onerror = () =>
      setLoaded((current) => ({ ...current, connection: "offline" }));

    return () => {
      cancelled = true;
      source.close();
    };
  }, [season]);

  /*
   * Hand the offline shell what is on screen when the app goes away.
   *
   * Live scores arrive over SSE, which the service worker never sees, so its
   * copy would otherwise be whatever the last page load fetched — an app left
   * open through a Sunday would still show the 19:00 table on Tuesday. Doing it
   * on the way out rather than on every push keeps a game day from writing to
   * the cache every 25 seconds for a copy nobody reads.
   */
  const latest = useRef<Snapshot | null>(null);
  useEffect(() => {
    latest.current = season === null ? loaded.snapshot : null;
  }, [loaded.snapshot, season]);

  useEffect(() => {
    if (season !== null) return;
    const remember = () => {
      if (document.visibilityState !== "hidden" || !latest.current) return;
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
