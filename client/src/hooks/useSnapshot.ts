import { useEffect, useRef, useState } from "react";
import { SNAPSHOT_URL, STREAM_URL } from "../lib/api";
import type { ConnectionState, Snapshot } from "../lib/types";

/**
 * The snapshot arrives over SSE and is pushed again whenever the server
 * re-polls ESPN, so the page never needs a manual refresh. A one-off fetch
 * runs alongside it purely so the first paint doesn't wait on the stream.
 */
export function useSnapshot(): { snapshot: Snapshot | null; connection: ConnectionState } {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const gotStream = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch(SNAPSHOT_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Snapshot | null) => {
        if (!cancelled && data && !gotStream.current) setSnapshot(data);
      })
      .catch(() => undefined);

    const source = new EventSource(STREAM_URL);
    source.onmessage = (event) => {
      gotStream.current = true;
      setSnapshot(JSON.parse(event.data) as Snapshot);
      setConnection("live");
    };
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection("offline");

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { snapshot, connection };
}
