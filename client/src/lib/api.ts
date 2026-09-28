export const API_BASE = "/api";
export const STREAM_URL = `${API_BASE}/stream`;
export const SNAPSHOT_URL = `${API_BASE}/snapshot`;
/** Asks the server to poll upstream now, rather than on its own schedule. */
export const REFRESH_URL = `${API_BASE}/refresh`;

/** A finished season's table. */
export const seasonUrl = (year: number) => `${API_BASE}/season/${year}`;

/**
 * One week. The live season's weeks and an archived season's come from
 * different stores on the server — a week number means nothing without the year
 * it belongs to.
 */
export const weekUrl = (seasonType: number, week: number, season: number | null) =>
  season === null
    ? `${API_BASE}/week/${seasonType}/${week}`
    : `${API_BASE}/season/${season}/week/${seasonType}/${week}`;

/**
 * One team's whole season, in order. Like the week, it needs the year: a
 * finished season's games come from a different store, and a team schedule
 * quietly showing *this* season under an archive banner would be a lie.
 */
export const teamScheduleUrl = (abbr: string, season: number | null) =>
  season === null
    ? `${API_BASE}/team/${encodeURIComponent(abbr)}/schedule`
    : `${API_BASE}/season/${season}/team/${encodeURIComponent(abbr)}/schedule`;
