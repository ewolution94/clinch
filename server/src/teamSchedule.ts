import type {
  GameResult,
  PostseasonGame,
  PostseasonRound,
  ScoreboardGame,
  TeamSchedule,
  TeamScheduleGame,
  WeekView,
} from "./types.js";

/**
 * One team's whole season, in order.
 *
 * Assembled from per-week views rather than fetched per team, so the weeks a
 * store has already read cost nothing and only the ones nobody has asked for
 * yet go upstream. It takes the week getter rather than a store, because both
 * stores can answer it: the live season's weeks come from the poll cache, a
 * finished one's from the archive, and the arithmetic in between — the bye, the
 * record, the order — is the same either way. It was the live store's private
 * method until the schedule became a tab of its own, at which point an archived
 * season quietly showing *this* season's fixtures stopped being acceptable.
 */

const REGULAR_SEASON_WEEKS = 18;

/** How many weeks are read at once. */
const BATCH = 6;

const POSTSEASON_LABEL: Record<PostseasonRound, string> = {
  wildcard: "Wild Card",
  divisional: "Divisional",
  championship: "Conference Championship",
  superbowl: "Super Bowl",
};

/** One scoreboard game, turned around to face a single team. */
export function toTeamGame(
  game: ScoreboardGame | PostseasonGame,
  abbr: string,
  seasonType: number,
  week: number,
  label: string,
): TeamScheduleGame {
  const home = game.home === abbr;
  const teamScore = home ? game.homeScore : game.awayScore;
  const opponentScore = home ? game.awayScore : game.homeScore;
  const final = game.state === "post" && teamScore !== null && opponentScore !== null;
  const result: GameResult | null = !final
    ? null
    : teamScore > opponentScore
      ? "W"
      : teamScore < opponentScore
        ? "L"
        : "T";

  return {
    id: game.id,
    seasonType,
    week,
    label,
    kickoff: game.kickoff,
    state: game.state,
    statusDetail: game.statusDetail,
    opponent: home ? game.away : game.home,
    home,
    teamScore,
    opponentScore,
    result,
    ...("broadcast" in game && game.broadcast ? { broadcast: game.broadcast } : {}),
    ...("abroad" in game && game.abroad ? { abroad: game.abroad } : {}),
  };
}

export interface TeamScheduleSource {
  abbr: string;
  season: number;
  /** One regular-season week. Rejecting is allowed; that week is left out. */
  week: (seasonType: number, week: number) => Promise<WeekView>;
  /** Already to hand in both stores' snapshots, so it is never re-fetched. */
  postseason: PostseasonGame[];
}

export async function assembleTeamSchedule({
  abbr,
  season,
  week: weekView,
  postseason,
}: TeamScheduleSource): Promise<TeamSchedule> {
  const weeks = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1);
  const played = new Set<number>();
  const games: TeamScheduleGame[] = [];

  // A few at a time rather than all eighteen at once: this is somebody else's
  // server, and the first reader to open a team in March would otherwise fire
  // seventeen requests in one breath.
  for (let i = 0; i < weeks.length; i += BATCH) {
    const batch = weeks.slice(i, i + BATCH);
    const views = await Promise.all(
      // A week that fails is left out rather than failing the season — a
      // schedule with a gap in it is still a schedule.
      batch.map((week) => weekView(2, week).catch(() => null)),
    );
    for (const view of views) {
      if (!view) continue;
      for (const game of view.games) {
        if (game.home !== abbr && game.away !== abbr) continue;
        played.add(view.week);
        games.push(toTeamGame(game, abbr, view.seasonType, view.week, view.label));
      }
    }
  }

  for (const game of postseason) {
    if (game.home !== abbr && game.away !== abbr) continue;
    games.push(toTeamGame(game, abbr, 3, 0, POSTSEASON_LABEL[game.round] ?? "Postseason"));
  }

  games.sort((a, b) => a.seasonType - b.seasonType || a.kickoff.localeCompare(b.kickoff));

  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of games) {
    if (game.result === "W") wins += 1;
    else if (game.result === "L") losses += 1;
    else if (game.result === "T") ties += 1;
  }

  // The bye is *the week with no game in it*, derived rather than stored — and
  // only meaningful once the weeks around it are actually known.
  const bye = weeks.find((week) => !played.has(week));
  return {
    team: abbr,
    season,
    games,
    byeWeek: played.size > 0 && bye !== undefined ? bye : null,
    record: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
  };
}
