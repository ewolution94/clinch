function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: int("PORT", 4600),
  /** Pin a season (e.g. 2025) instead of following the live one. */
  season: process.env.PYLON_SEASON ? Number.parseInt(process.env.PYLON_SEASON, 10) : null,
  /** Refresh cadence when nothing is being played. */
  refreshMs: int("PYLON_REFRESH_MS", 120_000),
  /** Refresh cadence while a game is in progress. */
  liveRefreshMs: int("PYLON_LIVE_REFRESH_MS", 25_000),
  /** How long a future week's schedule is trusted before re-fetching. */
  scheduleTtlMs: int("PYLON_SCHEDULE_TTL_MS", 3_600_000),
  requestTimeoutMs: int("PYLON_TIMEOUT_MS", 12_000),
};
