/**
 * Finished seasons.
 *
 * The live store follows one season and re-polls it forever. This one answers
 * for a season that is over, which makes it a much simpler object: a finished
 * season never changes, so every answer is built once and then held for as long
 * as the process lives.
 *
 * It is deliberately a separate store rather than a season parameter threaded
 * through `SnapshotStore`. That store's week cache is keyed by week alone —
 * correct while there is only ever one season in it, and silently wrong the
 * moment 2023's week 3 can land in the same slot as this week's.
 *
 * What an archived season is **not**: the app pointed at an old year. The
 * standings are that season's final table, which is a fact; there are no
 * broadcasts (German listings do not go back, and the games are long played)
 * and nothing streams, because nothing changes. The same rule as everywhere
 * else here — show what is true, and leave out what would have to be invented.
 */
import { fetchScoreboard, fetchStandings } from "./espn.js";
import { buildConferences } from "./derive.js";
import { config } from "./config.js";
import type {
  CalendarWeek,
  PostseasonGame,
  PostseasonRound,
  ScoreboardGame,
  Snapshot,
  WeekView,
} from "./types.js";

const REGULAR_SEASON_WEEKS = 18;

/** ESPN's postseason weeks. Week 4 is the Pro Bowl, which isn't a round. */
const POSTSEASON_WEEKS: [number, PostseasonRound][] = [
  [1, "wildcard"],
  [2, "divisional"],
  [3, "championship"],
  [5, "superbowl"],
];

/**
 * How many weeks are fetched at once. Building a season is 22 requests, and
 * they only ever happen once per season per process — but firing all 22 at a
 * public endpoint in one breath is rude, and this is somebody else's server.
 */
const BATCH = 6;

interface CachedWeek {
  games: ScoreboardGame[];
  byeTeams: string[];
}

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  }
  return out;
}

/**
 * Everything about a finished season except which season is the current one —
 * that changes under the cache, so the route adds it on the way out.
 */
export type ArchivedSeason = Omit<Snapshot, "currentSeason">;

export class ArchiveStore {
  private seasons = new Map<number, Promise<ArchivedSeason>>();
  private weeks = new Map<string, CachedWeek>();

  /** Only the seasons on the list, so a year can't be pushed upstream at will. */
  offers(year: number): boolean {
    return config.archiveSeasons.includes(year);
  }

  /**
   * Cached as the *promise*, not the result: two readers arriving together on
   * a cold container would otherwise both spend 22 requests building the same
   * season.
   */
  snapshot(year: number): Promise<ArchivedSeason> {
    const existing = this.seasons.get(year);
    if (existing) return existing;

    const building = this.build(year).catch((error: unknown) => {
      // A half-built season must not be cached, or one bad afternoon upstream
      // would make that year permanently broken until the container restarts.
      this.seasons.delete(year);
      throw error;
    });
    this.seasons.set(year, building);
    return building;
  }

  async week(year: number, seasonType: number, week: number): Promise<WeekView> {
    const cached = await this.weekGames(year, seasonType, week);
    const snapshot = await this.snapshot(year);
    const label =
      snapshot.calendar.find((c) => c.seasonType === seasonType && c.week === week)?.label ??
      `Week ${week}`;

    return {
      seasonType,
      week,
      label,
      games: cached.games,
      byeTeams: cached.byeTeams,
      // Every game in a finished season is played, so there is nothing to
      // re-check and no channel to look up.
      settled: true,
    };
  }

  private async weekGames(year: number, seasonType: number, week: number): Promise<CachedWeek> {
    const key = `${year}:${seasonType}:${week}`;
    const cached = this.weeks.get(key);
    if (cached) return cached;

    const payload = await fetchScoreboard({ season: year, seasonType, week }, config.requestTimeoutMs);
    const entry = { games: payload.games, byeTeams: payload.byeTeams };
    this.weeks.set(key, entry);
    return entry;
  }

  private async build(year: number): Promise<ArchivedSeason> {
    const weekNumbers = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1);

    // One week fetched first, purely for the season's own calendar — every
    // scoreboard response carries it, and the week browser needs it to know
    // which weeks exist and what they are called.
    const first = await fetchScoreboard(
      { season: year, seasonType: 2, week: 1 },
      config.requestTimeoutMs,
    );
    this.weeks.set(`${year}:2:1`, { games: first.games, byeTeams: first.byeTeams });
    const calendar: CalendarWeek[] = first.calendar;

    const regular = await inBatches(weekNumbers.slice(1), BATCH, async (week) => {
      try {
        return (await this.weekGames(year, 2, week)).games;
      } catch {
        // A missing week costs some form history, not the season.
        return [] as ScoreboardGame[];
      }
    });
    const games = [...first.games, ...regular.flat()];

    const postseason: PostseasonGame[] = (
      await inBatches(POSTSEASON_WEEKS, BATCH, async ([week, round]) => {
        try {
          const { games: played } = await this.weekGames(year, 3, week);
          return played.map((g) => ({ ...g, round }));
        } catch {
          return [] as PostseasonGame[];
        }
      })
    ).flat();

    const standings = await fetchStandings(year, config.requestTimeoutMs);
    const conferences = buildConferences(standings, games);

    return {
      generatedAt: Date.now(),
      season: { year, type: 2, label: "Final" },
      // The table is where the season ended, so the week is its last one.
      week: { number: REGULAR_SEASON_WEEKS, label: `Week ${REGULAR_SEASON_WEEKS}`, total: REGULAR_SEASON_WEEKS },
      live: false,
      stale: false,
      conferences,
      games: games.filter((g) => g.week === REGULAR_SEASON_WEEKS),
      postseason,
      calendar,
      archived: true,
      archiveSeasons: config.archiveSeasons,
    };
  }
}

export const archiveStore = new ArchiveStore();
