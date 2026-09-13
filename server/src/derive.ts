import type { StandingsPayload, RawEntry } from "./espn.js";
import type {
  ConferenceId,
  ConferenceView,
  DivisionName,
  DivisionView,
  GameRef,
  GameResult,
  ScoreboardGame,
  SeriesMatchup,
  TeamEntry,
} from "./types.js";
import { teamMeta } from "./teams.js";

/** Games each team plays in a regular season. One constant, one place to change. */
export const REGULAR_SEASON_GAMES = 17;
const PLAYOFF_SPOTS = 7;
const FORM_LENGTH = 5;

function statNumber(entry: RawEntry, name: string): number {
  const stat = entry.stats.find((s) => s.name === name);
  return typeof stat?.value === "number" ? stat.value : 0;
}

function statText(entry: RawEntry, name: string, fallback = "0-0"): string {
  const stat = entry.stats.find((s) => s.name === name);
  return stat?.displayValue ?? fallback;
}

/**
 * A team's record as a single number: a win is 1, a tie is half. Everything
 * downstream (games back, clinching, elimination) compares these, so ties stop
 * being a special case after this line.
 */
function points(wins: number, ties: number): number {
  return wins + ties / 2;
}

/** The classic standings formula, in the same win-is-1/tie-is-half currency. */
function gamesBetween(ahead: TeamEntry, behind: TeamEntry): number {
  const winDelta = points(ahead.wins, ahead.ties) - points(behind.wins, behind.ties);
  const lossDelta = points(behind.losses, behind.ties) - points(ahead.losses, ahead.ties);
  return Math.round(((winDelta + lossDelta) / 2) * 10) / 10;
}

/** Floor: the record a team ends on if it loses out. */
function floorPoints(team: TeamEntry): number {
  return points(team.wins, team.ties);
}

/** Ceiling: the record a team ends on if it wins out. */
function ceilingPoints(team: TeamEntry): number {
  return points(team.wins, team.ties) + team.gamesRemaining;
}

/**
 * Can `a` no longer be caught by `b`? True only when `a`'s worst case still
 * beats `b`'s best case — or when both teams are done playing and ESPN's seed,
 * which has the real tiebreakers behind it, already separates them.
 */
function finishesAhead(a: TeamEntry, b: TeamEntry): boolean {
  if (floorPoints(a) > ceilingPoints(b)) return true;
  const settled = a.gamesRemaining === 0 && b.gamesRemaining === 0;
  return settled && floorPoints(a) === ceilingPoints(b) && a.seed < b.seed;
}

function streakKind(display: string): GameResult | null {
  const first = display.charAt(0).toUpperCase();
  return first === "W" || first === "L" || first === "T" ? (first as GameResult) : null;
}

/* ------------------------------------------------------------------- games */

interface TeamGames {
  played: GameRef[];
  next: GameRef | null;
}

/**
 * Turn the flat list of games into a per-team schedule. Games still in progress
 * count as "next up" rather than as a result — a 10-3 lead in the second
 * quarter is not a win yet, and showing it as one is exactly the kind of thing
 * that makes a standings page untrustworthy.
 */
export function indexGamesByTeam(games: ScoreboardGame[]): Map<string, TeamGames> {
  const byTeam = new Map<string, TeamGames>();
  const ordered = [...games].sort((a, b) => a.week - b.week || a.kickoff.localeCompare(b.kickoff));

  const push = (abbr: string, ref: GameRef) => {
    const bucket = byTeam.get(abbr) ?? { played: [], next: null };
    if (ref.state === "post") bucket.played.push(ref);
    else if (!bucket.next) bucket.next = ref;
    byTeam.set(abbr, bucket);
  };

  for (const game of ordered) {
    const final = game.state === "post" && game.homeScore !== null && game.awayScore !== null;
    const homeResult: GameResult | null = !final
      ? null
      : game.homeScore! > game.awayScore!
        ? "W"
        : game.homeScore! < game.awayScore!
          ? "L"
          : "T";
    const awayResult: GameResult | null =
      homeResult === null ? null : homeResult === "W" ? "L" : homeResult === "L" ? "W" : "T";

    push(game.home, {
      id: game.id,
      week: game.week,
      kickoff: game.kickoff,
      opponent: game.away,
      home: true,
      result: homeResult,
      teamScore: game.homeScore,
      opponentScore: game.awayScore,
      state: game.state,
    });
    push(game.away, {
      id: game.id,
      week: game.week,
      kickoff: game.kickoff,
      opponent: game.home,
      home: false,
      result: awayResult,
      teamScore: game.awayScore,
      opponentScore: game.homeScore,
      state: game.state,
    });
  }

  return byTeam;
}

/* ------------------------------------------------------------- team entries */

function buildTeam(
  entry: RawEntry,
  conference: ConferenceId,
  division: DivisionName,
  divisionRank: number,
  schedule: Map<string, TeamGames>
): TeamEntry | null {
  const meta = teamMeta(entry.team.abbreviation);
  if (!meta) return null;

  const wins = statNumber(entry, "wins");
  const losses = statNumber(entry, "losses");
  const ties = statNumber(entry, "ties");
  const gamesPlayed = wins + losses + ties;
  const games = schedule.get(meta.abbr);
  const played = games?.played ?? [];

  return {
    abbr: meta.abbr,
    location: meta.location,
    name: meta.name,
    accent: meta.accent,
    conference,
    division,

    wins,
    losses,
    ties,
    winPct: statNumber(entry, "winPercent"),
    record: statText(entry, "overall", `${wins}-${losses}${ties ? `-${ties}` : ""}`),

    pointsFor: statNumber(entry, "pointsFor"),
    pointsAgainst: statNumber(entry, "pointsAgainst"),
    pointDiff: statNumber(entry, "pointDifferential"),

    streak: statText(entry, "streak", "—"),
    streakKind: streakKind(statText(entry, "streak", "")),

    divisionRecord: statText(entry, "divisionRecord"),
    conferenceRecord: statText(entry, "vs. Conf."),
    homeRecord: statText(entry, "Home"),
    roadRecord: statText(entry, "Road"),

    seed: statNumber(entry, "playoffSeed"),
    divisionRank,
    gamesPlayed,
    gamesRemaining: Math.max(0, REGULAR_SEASON_GAMES - gamesPlayed),

    status: "hunt",
    gamesBack: 0,
    gamesAhead: 0,

    form: played
      .slice(-FORM_LENGTH)
      .map((g) => g.result)
      .filter((r): r is GameResult => r !== null),
    recent: played.slice(-FORM_LENGTH),
    nextGame: games?.next ?? null,
  };
}

/* ------------------------------------------------------- playoff derivation */

/**
 * Clinch and elimination are decided by comparing a team's floor against other
 * teams' ceilings, never by guessing at probabilities. Every label the UI shows
 * is therefore something that is already mathematically settled:
 *
 *  - eliminated     — even winning out leaves the team behind the current 7th
 *                     seed's record, and that seed can only improve on it.
 *  - clinched       — losing out still leaves the team ahead of all nine teams
 *                     currently outside the cut, so at worst it finishes 7th.
 *
 * Both are sufficient conditions, not exhaustive ones: a team can be eliminated
 * in ways this doesn't catch (it needs full schedule analysis). Under-claiming
 * is the right way to be wrong here.
 */
function applyPlayoffStatus(teams: TeamEntry[]): void {
  const bySeed = [...teams].sort((a, b) => a.seed - b.seed);
  const cut = bySeed[PLAYOFF_SPOTS - 1];
  const firstOut = bySeed[PLAYOFF_SPOTS];
  if (!cut) return;

  const outsiders = bySeed.slice(PLAYOFF_SPOTS);
  const bestOutsiderCeiling = outsiders.reduce((max, t) => Math.max(max, ceilingPoints(t)), 0);
  const cutFloor = floorPoints(cut);

  for (const team of teams) {
    const inPlayoffs = team.seed <= PLAYOFF_SPOTS;
    team.gamesBack = inPlayoffs ? 0 : Math.max(0, gamesBetween(cut, team));
    team.gamesAhead = inPlayoffs && firstOut ? Math.max(0, gamesBetween(team, firstOut)) : 0;

    if (inPlayoffs) {
      const rivals = teams.filter((t) => t.abbr !== team.abbr);
      const divisionRivals = rivals.filter((t) => t.division === team.division);
      const clinchedDivision = divisionRivals.every((t) => finishesAhead(team, t));
      const clinchedBerth = outsiders.filter((t) => t.abbr !== team.abbr).every((t) => finishesAhead(team, t));
      const clinchedBye = clinchedDivision && rivals.every((t) => finishesAhead(team, t));

      team.status = clinchedBye
        ? "clinched-bye"
        : clinchedDivision
          ? "clinched-division"
          : clinchedBerth
            ? "clinched"
            : "in";
      continue;
    }

    if (ceilingPoints(team) < cutFloor) team.status = "eliminated";
    else if (team.gamesBack <= 1) team.status = "bubble";
    else if (team.gamesBack <= 3) team.status = "hunt";
    else team.status = "longshot";
  }
}

/**
 * ESPN reports `playoffSeed: 0` for a team that hasn't kicked off yet, which
 * would otherwise sort it above the whole conference. Ranked teams keep ESPN's
 * order exactly — it carries the real tiebreakers — and unranked ones are
 * slotted in by win differential, the only honest signal available before a
 * team has a win percentage. Renumbering afterwards keeps seeds contiguous.
 *
 * From the moment every team has played once, this is a no-op.
 */
function normaliseSeeds(teams: TeamEntry[]): TeamEntry[] {
  const ranked = teams.filter((t) => t.seed > 0).sort((a, b) => a.seed - b.seed);
  const unranked = teams.filter((t) => t.seed <= 0);
  if (unranked.length === 0) return ranked;

  const winDiff = (t: TeamEntry) => t.wins - t.losses;
  unranked.sort((a, b) => winDiff(b) - winDiff(a) || b.pointDiff - a.pointDiff || a.abbr.localeCompare(b.abbr));

  const merged: TeamEntry[] = [];
  let next = 0;
  for (const team of ranked) {
    while (next < unranked.length && winDiff(unranked[next]) > winDiff(team)) merged.push(unranked[next++]);
    merged.push(team);
  }
  merged.push(...unranked.slice(next));
  merged.forEach((team, i) => {
    team.seed = i + 1;
  });
  return merged;
}

/** Seeds 2v7, 3v6, 4v5. The 1 seed sits the round out. */
function wildCardMatchups(seeds: TeamEntry[]): SeriesMatchup[] {
  const pairings: [number, number][] = [
    [2, 7],
    [3, 6],
    [4, 5],
  ];
  const matchups: SeriesMatchup[] = [];
  for (const [higherSeed, lowerSeed] of pairings) {
    const higher = seeds.find((t) => t.seed === higherSeed);
    const lower = seeds.find((t) => t.seed === lowerSeed);
    if (!higher || !lower) continue;
    matchups.push({ round: "wildcard", higher: higher.abbr, lower: lower.abbr, higherSeed, lowerSeed });
  }
  return matchups;
}

const DIVISION_ORDER: DivisionName[] = ["East", "North", "South", "West"];

export function buildConferences(standings: StandingsPayload, games: ScoreboardGame[]): ConferenceView[] {
  const schedule = indexGamesByTeam(games);
  const conferences: ConferenceView[] = [];

  for (const confId of ["AFC", "NFC"] as const) {
    const divisions: DivisionView[] = [];
    const all: TeamEntry[] = [];

    for (const group of standings.divisions.filter((d) => d.conference === confId)) {
      const name = (DIVISION_ORDER.find((d) => group.division.endsWith(d)) ?? "East") as DivisionName;
      const teams = group.entries
        .map((entry) => buildTeam(entry, confId, name, 0, schedule))
        .filter((t): t is TeamEntry => t !== null);
      divisions.push({ id: `${confId} ${name}`, name, teams });
      all.push(...teams);
    }

    const seeds = normaliseSeeds(all);
    applyPlayoffStatus(all);

    // ESPN returns division members in its own order, which is not the
    // standings order. Conference seed has every tiebreaker applied, so sorting
    // a division by it gives the division table — and its winner — correctly.
    for (const division of divisions) {
      division.teams.sort((a, b) => a.seed - b.seed);
      division.teams.forEach((team, i) => {
        team.divisionRank = i + 1;
      });
    }
    divisions.sort((a, b) => DIVISION_ORDER.indexOf(a.name) - DIVISION_ORDER.indexOf(b.name));
    conferences.push({
      id: confId,
      name: confId === "AFC" ? "American Football Conference" : "National Football Conference",
      divisions,
      seeds,
      byeTeam: seeds.find((t) => t.seed === 1)?.abbr ?? null,
      wildCardGames: wildCardMatchups(seeds),
    });
  }

  return conferences;
}
