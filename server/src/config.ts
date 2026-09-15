function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Outlets that count as "I can watch this". */
function outlets(): ("RTL" | "RTL+" | "Nitro" | "Sky")[] {
  const known = ["RTL", "RTL+", "Nitro", "Sky"] as const;
  const raw = (process.env.CLINCH_OUTLETS ?? "RTL,RTL+").split(",").map((s) => s.trim());
  const picked = known.filter((k) => raw.some((r) => r.toLowerCase() === k.toLowerCase()));
  return picked.length > 0 ? [...picked] : ["RTL", "RTL+"];
}

export const config = {
  port: int("PORT", 4600),
  /** Pin a season (e.g. 2025) instead of following the live one. */
  season: process.env.CLINCH_SEASON ? Number.parseInt(process.env.CLINCH_SEASON, 10) : null,
  /** Refresh cadence when nothing is being played. */
  refreshMs: int("CLINCH_REFRESH_MS", 120_000),
  /** Refresh cadence while a game is in progress. */
  liveRefreshMs: int("CLINCH_LIVE_REFRESH_MS", 25_000),
  /** How long a future week's schedule is trusted before re-fetching. */
  scheduleTtlMs: int("CLINCH_SCHEDULE_TTL_MS", 3_600_000),
  /** How long an unsettled week is trusted when browsed — odds and times move. */
  weekTtlMs: int("CLINCH_WEEK_TTL_MS", 1_800_000),
  requestTimeoutMs: int("CLINCH_TIMEOUT_MS", 12_000),
  /** Set to "off" to stop looking German broadcasts up at all. */
  broadcasts: process.env.CLINCH_BROADCAST !== "off",
  /** How long a day of TV listings is trusted. They move a few times a day. */
  broadcastTtlMs: int("CLINCH_BROADCAST_TTL_MS", 21_600_000),
  /**
   * Which outlets count as watchable. Config rather than code so adding Nitro's
   * free conference or a Sky subscription later is an env change — the listings
   * parser already sees every channel.
   */
  outlets: outlets(),
};
