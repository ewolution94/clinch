import { fetchGameDetail } from "./gameDetail.js";
import { config } from "./config.js";
import type { GameDetail } from "./types.js";

interface CachedGame {
  detail: GameDetail;
  fetchedAt: number;
}

/** A final game never changes; a live one changes constantly. */
const TTL_MS: Record<GameDetail["state"], number> = {
  post: Number.POSITIVE_INFINITY,
  in: 20_000,
  pre: 600_000,
};

/**
 * Caches per-game detail, keyed by ESPN event id.
 *
 * Bounded on purpose: this cache is keyed by something that arrives in a URL,
 * so left unbounded it is a slow memory leak on a machine that is expected to
 * stay up for months.
 */
export class GameDetailStore {
  private cache = new Map<string, CachedGame>();
  private inFlight = new Map<string, Promise<GameDetail>>();

  constructor(private readonly maxEntries = 40) {}

  async get(id: string): Promise<GameDetail> {
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS[cached.detail.state]) {
      // Refresh recency so the busy games survive eviction.
      this.cache.delete(id);
      this.cache.set(id, cached);
      return cached.detail;
    }

    // Several viewers opening the same live game shouldn't each hit ESPN.
    const existing = this.inFlight.get(id);
    if (existing) return existing;

    const request = fetchGameDetail(id, config.requestTimeoutMs)
      .then((detail) => {
        this.cache.set(id, { detail, fetchedAt: Date.now() });
        this.evict();
        return detail;
      })
      .catch((error) => {
        // A stale copy beats an error page when the upstream blips.
        if (cached) return cached.detail;
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(id);
      });

    this.inFlight.set(id, request);
    return request;
  }

  private evict(): void {
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next();
      if (oldest.done) break;
      this.cache.delete(oldest.value);
    }
  }
}
