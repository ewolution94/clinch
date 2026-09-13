import { useEffect, useState } from "react";
import type { GameDetail } from "../lib/types";

const LIVE_POLL_MS = 20_000;

interface GameDetailState {
  detail: GameDetail | null;
  loading: boolean;
  error: boolean;
}

/** Which game the held state belongs to, so a change of id reads as loading. */
interface Loaded {
  id: string;
  detail: GameDetail | null;
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
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const res = await fetch(`/api/game/${id}`);
        if (!res.ok) throw new Error(String(res.status));
        const detail = (await res.json()) as GameDetail;
        if (cancelled) return;
        setLoaded({ id, detail, error: false });
        if (detail.state === "in") timer = setTimeout(load, LIVE_POLL_MS);
      } catch {
        if (!cancelled) setLoaded((prev) => ({ id, detail: prev?.id === id ? prev.detail : null, error: true }));
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  // Derived rather than reset in the effect: state held for a different game is
  // simply not this game's state, so switching ids reads as loading with no
  // extra render.
  const current = loaded && loaded.id === id ? loaded : null;
  return {
    detail: current?.detail ?? null,
    loading: id !== null && current === null,
    error: current?.error ?? false,
  };
}
