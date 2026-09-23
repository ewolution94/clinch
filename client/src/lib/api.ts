export const API_BASE = "/api";
export const STREAM_URL = `${API_BASE}/stream`;
export const SNAPSHOT_URL = `${API_BASE}/snapshot`;

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
