import type {
  ConferenceView,
  DivisionView,
  GameRef,
  GameResult,
  PlayoffStatus,
  ScoreboardGame,
  TeamEntry,
} from "./types";

/**
 * The table as it would stand if every game in progress ended right now.
 *
 * A Sunday evening question: four games are on, and the thing you actually want
 * to know is what the picture looks like if these results hold. The app will
 * not guess at anything — but this isn't a guess. Every number here is
 * arithmetic on a score that has already been put on the board; the only
 * assumption is the one the reader makes by asking, and the view says plainly
 * that it is provisional.
 *
 * **What it cannot do is tiebreakers.** Conference seeds come from ESPN with
 * the NFL's full chain already applied (head-to-head, common games, strength of
 * victory), and none of that can be recomputed from a snapshot. So the rule
 * here is: order by win percentage, and where two teams come out level, *keep
 * the order they already had* — which is the order those tiebreakers produced.
 * A team only ever moves past another when its record genuinely passes it.
 * Teams that finish level may really settle the other way, and the UI says so.
 *
 * It runs on the client, not the server, for one measured reason: `conferences`
 * is 70 kB of a 75 kB snapshot, so shipping a second adjusted copy would nearly
 * double every push — every 25 seconds, for hours, on a phone, precisely when
 * games are live. The client already has every number it needs.
 */

const PLAYOFF_SPOTS = 7;

/* The arithmetic below mirrors server/src/derive.ts deliberately. Both are
   covered by a test that runs this projection against the server building the
   same table from finished games, and asserts they agree exactly — so the two
   cannot drift apart quietly. Change one, run `npm test`, change the other. */

/** A win is 1, a tie is half — so ties stop being a special case. */
function points(team: { wins: number; ties: number }): number {
  return team.wins + team.ties / 2;
}

function gamesBetween(ahead: TeamEntry, behind: TeamEntry): number {
  const winDelta = points(ahead) - points(behind);
  const lossDelta = behind.losses + behind.ties / 2 - (ahead.losses + ahead.ties / 2);
  return Math.round(((winDelta + lossDelta) / 2) * 10) / 10;
}

const floorPoints = (team: TeamEntry) => points(team);
const ceilingPoints = (team: TeamEntry) => points(team) + team.gamesRemaining;

function finishesAhead(a: TeamEntry, b: TeamEntry): boolean {
  if (floorPoints(a) > ceilingPoints(b)) return true;
  const settled = a.gamesRemaining === 0 && b.gamesRemaining === 0;
  return settled && floorPoints(a) === ceilingPoints(b) && a.seed < b.seed;
}

/** "W2" plus another win is "W3"; plus a loss it starts again at "L1". */
function nextStreak(streak: string, kind: GameResult | null, result: GameResult): string {
  const count = Number.parseInt(streak.slice(1), 10);
  if (kind === result && Number.isFinite(count)) return `${result}${count + 1}`;
  return `${result}1`;
}

interface Provisional {
  result: GameResult;
  scored: number;
  conceded: number;
  /** The game itself, so it can join the team's recent results. */
  ref: GameRef;
}

/** Who is winning each game that is being played, and by how much. */
function inProgress(games: ScoreboardGame[]): Map<string, Provisional> {
  const out = new Map<string, Provisional>();
  for (const game of games) {
    if (game.state !== "in" || game.homeScore === null || game.awayScore === null) continue;
    const home: GameResult =
      game.homeScore > game.awayScore ? "W" : game.homeScore < game.awayScore ? "L" : "T";
    const away: GameResult = home === "W" ? "L" : home === "L" ? "W" : "T";
    const ref = (result: GameResult, isHome: boolean): GameRef => ({
      id: game.id,
      week: game.week,
      kickoff: game.kickoff,
      opponent: isHome ? game.away : game.home,
      home: isHome,
      result,
      teamScore: isHome ? game.homeScore : game.awayScore,
      opponentScore: isHome ? game.awayScore : game.homeScore,
      state: game.state,
    });
    out.set(game.home, {
      result: home,
      scored: game.homeScore,
      conceded: game.awayScore,
      ref: ref(home, true),
    });
    out.set(game.away, {
      result: away,
      scored: game.awayScore,
      conceded: game.homeScore,
      ref: ref(away, false),
    });
  }
  return out;
}

function project(team: TeamEntry, live: Provisional): TeamEntry {
  const wins = team.wins + (live.result === "W" ? 1 : 0);
  const losses = team.losses + (live.result === "L" ? 1 : 0);
  const ties = team.ties + (live.result === "T" ? 1 : 0);
  const gamesPlayed = team.gamesPlayed + 1;
  const pointsFor = team.pointsFor + live.scored;
  const pointsAgainst = team.pointsAgainst + live.conceded;

  return {
    ...team,
    wins,
    losses,
    ties,
    gamesPlayed,
    gamesRemaining: Math.max(0, team.gamesRemaining - 1),
    winPct: gamesPlayed > 0 ? (wins + ties / 2) / gamesPlayed : 0,
    record: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
    pointsFor,
    pointsAgainst,
    pointDiff: pointsFor - pointsAgainst,
    streak: nextStreak(team.streak, team.streakKind, live.result),
    streakKind: live.result,
    /*
     * The last five, with the one being played on the end — both the dots and
     * the list they expand into. Updating only the record would leave a row
     * reading "3-1" above three straight wins, which reads as a bug rather
     * than as a projection.
     */
    form: [...team.form, live.result].slice(-5),
    recent: [...team.recent, live.ref].slice(-5),
  };
}

/** Clinched, eliminated, and how far off the cut — the same rules as the server. */
function applyStatus(teams: TeamEntry[]): void {
  const bySeed = [...teams].sort((a, b) => a.seed - b.seed);
  const cut = bySeed[PLAYOFF_SPOTS - 1];
  const firstOut = bySeed[PLAYOFF_SPOTS];
  if (!cut) return;

  const outsiders = bySeed.slice(PLAYOFF_SPOTS);

  for (const team of teams) {
    const inPlayoffs = team.seed <= PLAYOFF_SPOTS;
    team.gamesBack = inPlayoffs ? 0 : Math.max(0, gamesBetween(cut, team));
    team.gamesAhead = inPlayoffs && firstOut ? Math.max(0, gamesBetween(team, firstOut)) : 0;

    if (inPlayoffs) {
      const rivals = teams.filter((t) => t.abbr !== team.abbr);
      const divisionRivals = rivals.filter((t) => t.division === team.division);
      const clinchedDivision = divisionRivals.every((t) => finishesAhead(team, t));
      const clinchedBerth = outsiders
        .filter((t) => t.abbr !== team.abbr)
        .every((t) => finishesAhead(team, t));
      const clinchedBye = clinchedDivision && rivals.every((t) => finishesAhead(team, t));

      team.status = (
        clinchedBye
          ? "clinched-bye"
          : clinchedDivision
            ? "clinched-division"
            : clinchedBerth
              ? "clinched"
              : "in"
      ) as PlayoffStatus;
      continue;
    }

    if (finishesAhead(cut, team)) team.status = "eliminated";
    else if (team.gamesBack <= 1) team.status = "bubble";
    else if (team.gamesBack <= 3) team.status = "hunt";
    else team.status = "longshot";
  }
}

/** True when any game in this list is being played right now. */
export function hasLiveGames(games: ScoreboardGame[]): boolean {
  return games.some((g) => g.state === "in" && g.homeScore !== null && g.awayScore !== null);
}

export function applyLiveResults(
  conferences: ConferenceView[],
  games: ScoreboardGame[],
): ConferenceView[] {
  const live = inProgress(games);
  // Nothing being played: hand back exactly what came in, so React sees the
  // same object and nothing below re-renders.
  if (live.size === 0) return conferences;

  return conferences.map((conference) => {
    const projected = conference.seeds.map((team) => {
      const update = live.get(team.abbr);
      return update ? project(team, update) : { ...team };
    });

    /*
     * Order by win percentage, and let a tie keep the order it already had.
     * The input is in seed order, and `Array.prototype.sort` is stable, so
     * teams that come out level stay as ESPN's tiebreakers left them — the
     * only movement is a team whose record genuinely passed another's.
     */
    const ranked = [...projected].sort((a, b) => b.winPct - a.winPct);
    ranked.forEach((team, i) => {
      team.seed = i + 1;
    });

    applyStatus(ranked);

    const byAbbr = new Map(ranked.map((t) => [t.abbr, t]));
    const divisions: DivisionView[] = conference.divisions.map((division) => {
      const teams = division.teams
        .map((t) => byAbbr.get(t.abbr) ?? t)
        .sort((a, b) => a.seed - b.seed);
      teams.forEach((team, i) => {
        team.divisionRank = i + 1;
      });
      return { ...division, teams };
    });

    return {
      ...conference,
      seeds: ranked,
      divisions,
      byeTeam: ranked.find((t) => t.seed === 1)?.abbr ?? null,
      // The wild card matchups the new seeding produces.
      wildCardGames: conference.wildCardGames.map((match) => {
        const higher = ranked.find((t) => t.seed === match.higherSeed);
        const lower = ranked.find((t) => t.seed === match.lowerSeed);
        return {
          ...match,
          higher: higher?.abbr ?? match.higher,
          lower: lower?.abbr ?? match.lower,
        };
      }),
    };
  });
}
