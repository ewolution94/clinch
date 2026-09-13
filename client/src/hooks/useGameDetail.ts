import { useEffect, useState } from "react";
import type { GameDetail } from "../lib/types";

const LIVE_POLL_MS = 20_000;

interface GameDetailState {
  detail: GameDetail | null;
  loading: boolean;
  error: boolean;
}

/**
 * Loads one game's detail, and keeps re-polling while that game is in progress.
 *
 * The snapshot stream already keeps the *cards* live; the modal owning its own
 * poll is simpler than widening the snapshot to carry per-game detail nobody
 * has asked for yet, and it stops the moment the modal closes.
 */
export function useGameDetail(id: string | null): GameDetailState {
  const [state, setState] = useState<GameDetailState>({ detail: null, loading: false, error: false });

  useEffect(() => {
    if (!id) {
      setState({ detail: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setState({ detail: null, loading: true, error: false });

    const load = async () => {
      try {
        const res = await fetch(`/api/game/${id}`);
        if (!res.ok) throw new Error(String(res.status));
        const detail = (await res.json()) as GameDetail;
        if (cancelled) return;
        setState({ detail, loading: false, error: false });
        if (detail.state === "in") timer = setTimeout(load, LIVE_POLL_MS);
      } catch {
        if (!cancelled) setState((prev) => ({ detail: prev.detail, loading: false, error: true }));
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  return state;
}
