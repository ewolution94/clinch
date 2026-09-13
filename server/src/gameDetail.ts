import { getJson, SITE } from "./espn.js";
import { teamMeta } from "./teams.js";
import type { GameDetail, GameTeamDetail, ScoringPlayDetail } from "./types.js";

/**
 * The four team numbers the modal shows, and the labels it shows them under.
 * ESPN returns twenty-five; the rest are dropped here rather than in the
 * client, which is most of the difference between a ~4 kB and a ~9 kB response.
 */
const TEAM_STATS: [string, string][] = [
  ["totalYards", "Total yards"],
  ["turnovers", "Turnovers"],
  ["thirdDownEff", "3rd down"],
  ["possessionTime", "Possession"],
];

const LEADER_CATEGORIES: [string, string][] = [
  ["passingYards", "Passing"],
  ["rushingYards", "Rushing"],
  ["receivingYards", "Receiving"],
];

/* ------------------------------------------------------ upstream shapes */

interface RawCompetitor {
  homeAway?: string;
  score?: string;
  team?: { abbreviation?: string };
  record?: { type?: string; summary?: string }[];
  linescores?: { displayValue?: string; value?: number }[];
}

interface RawSummary {
  header?: {
    competitions?: {
      id?: string;
      date?: string;
      competitors?: RawCompetitor[];
      status?: {
        period?: number;
        displayClock?: string;
        type?: { state?: string; shortDetail?: string; detail?: string };
      };
    }[];
  };
  boxscore?: {
    teams?: {
      team?: { abbreviation?: string };
      statistics?: { name?: string; label?: string; displayValue?: string }[];
    }[];
  };
  leaders?: {
    team?: { abbreviation?: string };
    leaders?: {
      name?: string;
      leaders?: { displayValue?: string; athlete?: { shortName?: string; displayName?: string } }[];
    }[];
  }[];
  scoringPlays?: {
    id?: string;
    period?: { number?: number };
    clock?: { displayValue?: string };
    team?: { abbreviation?: string };
    type?: { text?: string };
    text?: string;
    awayScore?: number;
    homeScore?: number;
  }[];
  gameInfo?: {
    attendance?: number;
    venue?: { fullName?: string; address?: { city?: string; state?: string } };
  };
  pickcenter?: { details?: string }[];
  format?: { regulation?: { periods?: number } };
}

/* ----------------------------------------------------------- normalising */

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseState(state: string | undefined): "pre" | "in" | "post" {
  if (state === "in") return "in";
  if (state === "post") return "post";
  return "pre";
}

function statsFor(raw: RawSummary, abbr: string): { label: string; value: string }[] {
  const team = raw.boxscore?.teams?.find((t) => t.team?.abbreviation === abbr);
  if (!team?.statistics) return [];

  const out: { label: string; value: string }[] = [];
  for (const [name, label] of TEAM_STATS) {
    const stat = team.statistics.find((s) => s.name === name);
    if (stat?.displayValue) out.push({ label, value: stat.displayValue });
  }
  return out;
}

function leadersFor(raw: RawSummary, abbr: string): GameTeamDetail["leaders"] {
  const team = raw.leaders?.find((t) => t.team?.abbreviation === abbr);
  if (!team?.leaders) return [];

  const out: GameTeamDetail["leaders"] = [];
  for (const [name, category] of LEADER_CATEGORIES) {
    const group = team.leaders.find((g) => g.name === name);
    const best = group?.leaders?.[0];
    const athlete = best?.athlete?.shortName ?? best?.athlete?.displayName;
    // ESPN's displayValue is already formatted ("25/35, 254 YDS, 1 TD"), so it
    // is passed through untouched rather than reassembled from parts.
    if (athlete && best?.displayValue) out.push({ category, athlete, line: best.displayValue });
  }
  return out;
}

function buildTeam(raw: RawSummary, competitor: RawCompetitor): GameTeamDetail | null {
  const meta = teamMeta(competitor.team?.abbreviation ?? "");
  if (!meta) return null;

  return {
    abbr: meta.abbr,
    location: meta.location,
    name: meta.name,
    accent: meta.accent,
    homeAway: competitor.homeAway === "home" ? "home" : "away",
    score: toNumber(competitor.score),
    record: competitor.record?.find((r) => r.type === "total")?.summary ?? null,
    linescores: (competitor.linescores ?? []).map((l) => toNumber(l.displayValue) ?? l.value ?? 0),
    stats: statsFor(raw, meta.abbr),
    leaders: leadersFor(raw, meta.abbr),
  };
}

export async function fetchGameDetail(id: string, timeoutMs: number): Promise<GameDetail> {
  const raw = await getJson<RawSummary>(`${SITE}/summary?event=${encodeURIComponent(id)}`, timeoutMs);

  const competition = raw.header?.competitions?.[0];
  if (!competition) throw new Error(`no competition in summary for ${id}`);

  const teams = (competition.competitors ?? [])
    .map((c) => buildTeam(raw, c))
    .filter((t): t is GameTeamDetail => t !== null)
    // Always [away, home] — the order a football game is written and read in.
    .sort((a, b) => (a.homeAway === "away" ? -1 : 1) - (b.homeAway === "away" ? -1 : 1));

  if (teams.length !== 2) throw new Error(`expected 2 known teams for ${id}, got ${teams.length}`);

  const status = competition.status;
  const state = normaliseState(status?.type?.state);
  const byAbbr = new Set(teams.map((t) => t.abbr));

  const scoring: ScoringPlayDetail[] = (raw.scoringPlays ?? [])
    .map((play, i) => {
      const meta = teamMeta(play.team?.abbreviation ?? "");
      if (!meta || !byAbbr.has(meta.abbr)) return null;
      return {
        id: play.id ?? `${id}-${i}`,
        period: play.period?.number ?? 0,
        clock: play.clock?.displayValue ?? "",
        teamAbbr: meta.abbr,
        type: play.type?.text ?? "",
        text: play.text ?? "",
        away: play.awayScore ?? 0,
        home: play.homeScore ?? 0,
      };
    })
    .filter((p): p is ScoringPlayDetail => p !== null);

  const venue = raw.gameInfo?.venue;

  return {
    id,
    state,
    statusDetail: status?.type?.shortDetail ?? status?.type?.detail ?? "",
    // Only meaningful while a game is running; afterwards every period is real.
    period: state === "in" ? (status?.period ?? null) : null,
    clock: state === "in" ? (status?.displayClock ?? null) : null,
    kickoff: competition.date ?? "",
    venue: venue?.fullName
      ? { name: venue.fullName, city: venue.address?.city ?? "", state: venue.address?.state ?? "" }
      : null,
    attendance: raw.gameInfo?.attendance ?? null,
    odds: raw.pickcenter?.[0]?.details ?? null,
    regulationPeriods: raw.format?.regulation?.periods ?? 4,
    teams,
    scoring,
  };
}
