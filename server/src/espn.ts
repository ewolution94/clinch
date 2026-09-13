import type { ScoreboardGame } from "./types.js";
import { teamMeta } from "./teams.js";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const CORE = "https://site.api.espn.com/apis/v2/sports/football/nfl";

const USER_AGENT = "pylon/1.0 (+https://github.com/ewolution94/pylon)";

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- standings */

export interface RawStat {
  name?: string;
  value?: number | null;
  displayValue?: string;
}
export interface RawEntry {
  team: { abbreviation: string; displayName: string };
  stats: RawStat[];
}
export interface RawGroup {
  name?: string;
  abbreviation?: string;
  children?: RawGroup[];
  standings?: { season: number; seasonType: number; entries: RawEntry[] };
}

export interface StandingsPayload {
  season: number;
  seasonType: number;
  /** Keyed by `AFC East` … in ESPN's own order, which is the standings order. */
  divisions: { conference: "AFC" | "NFC"; division: string; entries: RawEntry[] }[];
}

export async function fetchStandings(season: number | null, timeoutMs: number): Promise<StandingsPayload> {
  const url = `${CORE}/standings?level=3${season ? `&season=${season}` : ""}`;
  const raw = await getJson<RawGroup>(url, timeoutMs);

  const divisions: StandingsPayload["divisions"] = [];
  let resolvedSeason = season ?? new Date().getFullYear();
  let seasonType = 2;

  for (const conf of raw.children ?? []) {
    const confId = conf.abbreviation === "AFC" ? "AFC" : "NFC";
    for (const div of conf.children ?? []) {
      const standings = div.standings;
      if (!standings) continue;
      resolvedSeason = standings.season ?? resolvedSeason;
      seasonType = standings.seasonType ?? seasonType;
      divisions.push({
        conference: confId,
        division: div.name ?? `${confId} ${div.abbreviation ?? ""}`.trim(),
        entries: standings.entries ?? [],
      });
    }
  }

  if (divisions.length !== 8) throw new Error(`expected 8 divisions from ESPN, got ${divisions.length}`);
  return { season: resolvedSeason, seasonType, divisions };
}

/* --------------------------------------------------------------- scoreboard */

interface RawCompetitor {
  homeAway: "home" | "away";
  team: { abbreviation: string };
  score?: string;
}
interface RawEvent {
  id: string;
  date: string;
  week?: { number?: number };
  status?: { type?: { state?: string; shortDetail?: string; detail?: string } };
  competitions: { competitors: RawCompetitor[]; status?: { type?: { state?: string; shortDetail?: string } } }[];
}
interface RawScoreboard {
  season?: { year?: number; type?: number };
  week?: { number?: number };
  events?: RawEvent[];
}

export interface ScoreboardPayload {
  season: number;
  seasonType: number;
  week: number;
  games: ScoreboardGame[];
}

function parseScore(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normaliseState(state: string | undefined): "pre" | "in" | "post" {
  if (state === "in") return "in";
  if (state === "post") return "post";
  return "pre";
}

export async function fetchScoreboard(
  opts: { season?: number; seasonType?: number; week?: number },
  timeoutMs: number
): Promise<ScoreboardPayload> {
  const params = new URLSearchParams();
  if (opts.season) params.set("dates", String(opts.season));
  if (opts.seasonType) params.set("seasontype", String(opts.seasonType));
  if (opts.week) params.set("week", String(opts.week));
  const qs = params.toString();
  const raw = await getJson<RawScoreboard>(`${SITE}/scoreboard${qs ? `?${qs}` : ""}`, timeoutMs);

  const week = raw.week?.number ?? opts.week ?? 1;
  const games: ScoreboardGame[] = [];

  for (const event of raw.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;
    // Skip teams we don't know about (Pro Bowl rosters, relocations we haven't mapped).
    if (!teamMeta(home.team.abbreviation) || !teamMeta(away.team.abbreviation)) continue;

    const status = comp.status?.type ?? event.status?.type;
    games.push({
      id: event.id,
      week: event.week?.number ?? week,
      kickoff: event.date,
      state: normaliseState(status?.state),
      statusDetail: status?.shortDetail ?? "",
      home: teamMeta(home.team.abbreviation)!.abbr,
      away: teamMeta(away.team.abbreviation)!.abbr,
      homeScore: parseScore(home.score),
      awayScore: parseScore(away.score),
    });
  }

  games.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  return {
    season: raw.season?.year ?? opts.season ?? new Date().getFullYear(),
    seasonType: raw.season?.type ?? opts.seasonType ?? 2,
    week,
    games,
  };
}
