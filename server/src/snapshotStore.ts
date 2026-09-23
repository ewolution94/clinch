import { fetchScoreboard, fetchStandings } from "./espn.js";
import { buildConferences } from "./derive.js";
import { broadcastStore } from "./broadcastStore.js";
import { config } from "./config.js";
import { describeError } from "./describeError.js";
import type {
  PostseasonGame,
  PostseasonRound,
  ScoreboardGame,
  Snapshot,
  WeekView,
} from "./types.js";

const REGULAR_SEASON_WEEKS = 18;

interface CachedWeek {
  games: ScoreboardGame[];
  fetchedAt: number;
  /** A week whose games have all finished never changes again. */
  settled: boolean;
  byeTeams: string[];
}

/** One cache for every week of either season type. */
function weekKey(seasonType: number, week: number): string {
  return `${seasonType}:${week}`;
}

const SEASON_TYPE_LABEL: Record<number, string> = { 1: "Preseason", 2: "Regular season", 3: "Postseason" };

/** ESPN's postseason weeks. Week 4 is the Pro Bowl, which isn't a round. */
const POSTSEASON_WEEKS: [number, PostseasonRound][] = [
  [1, "wildcard"],
  [2, "divisional"],
  [3, "championship"],
  [5, "superbowl"],
];

export class SnapshotStore {
  private snapshot: Snapshot | null = null;
  private weeks = new Map<string, CachedWeek>();

  private listeners = new Set<(snapshot: Snapshot) => void>();
  private timer: NodeJS.Timeout | null = null;
  private refreshing = false;

  get current(): Snapshot | null {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: Snapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    void this.refresh();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.refresh(), delayMs);
  }

  private async weekGames(season: number, week: number): Promise<ScoreboardGame[]> {
    const cached = this.weeks.get(weekKey(2, week));
    if (cached?.settled) return cached.games;
    if (cached && Date.now() - cached.fetchedAt < config.scheduleTtlMs) return cached.games;

    const payload = await fetchScoreboard({ season, seasonType: 2, week }, config.requestTimeoutMs);
    const settled = payload.games.length > 0 && payload.games.every((g) => g.state === "post");
    this.weeks.set(weekKey(2, week), {
      games: payload.games,
      fetchedAt: Date.now(),
      settled,
      byeTeams: payload.byeTeams,
    });
    return payload.games;
  }

  /**
   * Playoff games as they're actually played. Unlike regular-season weeks these
   * are re-fetched until every game in the round is final — a round in progress
   * is exactly when someone is watching the bracket.
   */
  private async fetchPostseason(season: number): Promise<PostseasonGame[]> {
    const out: PostseasonGame[] = [];

    for (const [week, round] of POSTSEASON_WEEKS) {
      const cached = this.weeks.get(weekKey(3, week));
      if (cached?.settled) {
        out.push(...cached.games.map((g) => ({ ...g, round })));
        continue;
      }
      try {
        const payload = await fetchScoreboard({ season, seasonType: 3, week }, config.requestTimeoutMs);
        const settled = payload.games.length > 0 && payload.games.every((g) => g.state === "post");
        this.weeks.set(weekKey(3, week), {
          games: payload.games,
          fetchedAt: Date.now(),
          settled,
          byeTeams: payload.byeTeams,
        });
        out.push(...payload.games.map((g) => ({ ...g, round })));
      } catch {
        if (cached) out.push(...cached.games.map((g) => ({ ...g, round })));
      }
    }

    return out;
  }

  /**
   * Any week, for the browser. Shares the cache the poll loop already fills, so
   * asking for the current week costs nothing and a settled week is fetched
   * once ever.
   */
  async week(seasonType: number, week: number): Promise<WeekView> {
    const season = this.snapshot?.season.year ?? config.season ?? new Date().getFullYear();
    const key = weekKey(seasonType, week);
    const cached = this.weeks.get(key);
    const label =
      this.snapshot?.calendar.find((c) => c.seasonType === seasonType && c.week === week)?.label ??
      `Week ${week}`;

    // Settled weeks are frozen. Everything else has a short life: kickoff times
    // and odds move, and the live week is refreshed by the poll loop anyway.
    const ttl = cached?.settled ? Number.POSITIVE_INFINITY : config.weekTtlMs;
    const fresh =
      cached && Date.now() - cached.fetchedAt < ttl
        ? cached
        : await (async () => {
            const payload = await fetchScoreboard(
              { season, seasonType, week },
              config.requestTimeoutMs
            );
            const settled = payload.games.length > 0 && payload.games.every((g) => g.state === "post");
            const entry = {
              games: payload.games,
              fetchedAt: Date.now(),
              settled,
              byeTeams: payload.byeTeams,
            };
            this.weeks.set(key, entry);
            return entry;
          })();

    // Broadcasts are annotated on the way out rather than stored: they come from
    // a different source on a different clock, and a settled week never needs
    // them. The store below is cached and swallows its own failures, so a bad
    // day of listings costs a badge and nothing else.
    const { games, broadcasts } = await broadcastStore.annotate(week, fresh.games);

    return {
      seasonType,
      week,
      label,
      games,
      byeTeams: fresh.byeTeams,
      settled: fresh.settled,
      broadcasts,
    };
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;

    try {
      // Always ask unpinned: it's the only call that reports which week the
      // league is actually on. Asking it for a specific season without a week
      // is not the same question — ESPN reads `dates=YYYY` as the calendar
      // year, and hands back January's games from the *previous* season.
      const live = await fetchScoreboard({}, config.requestTimeoutMs);
      const pinnedToPast = config.season !== null && config.season !== live.season;
      const season = config.season ?? live.season;
      const seasonType = pinnedToPast ? 2 : live.seasonType;

      const currentWeek = pinnedToPast
        ? REGULAR_SEASON_WEEKS
        : seasonType === 1
          ? 0
          : seasonType === 3
            ? REGULAR_SEASON_WEEKS
            : live.week;

      // The live response is this week's games — but only when "this week" is
      // the week we're rendering. For a pinned season every week is fetched by
      // number instead.
      const liveIsCurrent = !pinnedToPast && seasonType === 2;
      if (liveIsCurrent) {
        this.weeks.set(weekKey(2, currentWeek), {
          games: live.games,
          fetchedAt: Date.now(),
          settled: live.games.length > 0 && live.games.every((g) => g.state === "post"),
          byeTeams: live.byeTeams,
        });
      }

      // Weeks 1..N feed recent form; the week after feeds "next game". Settled
      // weeks are only ever fetched once, so steady state is one request here.
      const wanted: number[] = [];
      for (let w = 1; w <= Math.min(currentWeek + 1, REGULAR_SEASON_WEEKS); w++) {
        if (!liveIsCurrent || w !== currentWeek) wanted.push(w);
      }
      const allGames: ScoreboardGame[] = liveIsCurrent ? [...live.games] : [];
      for (const week of wanted) {
        try {
          allGames.push(...(await this.weekGames(season, week)));
        } catch {
          // A single missing week costs us some form history, not the page.
        }
      }

      // There is no postseason to read during a regular season, so don't ask.
      const postseason =
        pinnedToPast || seasonType === 3 ? await this.fetchPostseason(season) : [];

      const standings = await fetchStandings(config.season, config.requestTimeoutMs);
      const conferences = buildConferences(standings, allGames);
      const weekGames = allGames.filter((g) => g.week === (currentWeek || 1));
      const anyLive = weekGames.some((g) => g.state === "in");

      this.publish({
        generatedAt: Date.now(),
        season: { year: season, type: seasonType, label: SEASON_TYPE_LABEL[seasonType] ?? "Season" },
        week: {
          number: currentWeek,
          label: seasonType === 2 ? `Week ${currentWeek}` : (SEASON_TYPE_LABEL[seasonType] ?? "Season"),
          total: REGULAR_SEASON_WEEKS,
        },
        live: anyLive,
        stale: false,
        conferences,
        games: weekGames,
        postseason,
        calendar: live.calendar,
        archiveSeasons: config.archiveSeasons.filter((y) => y !== season),
        currentSeason: season,
      });

      this.schedule(anyLive ? config.liveRefreshMs : config.refreshMs);
    } catch (error) {
      console.error("[clinch] refresh failed:", describeError(error));
      if (this.snapshot) this.publish({ ...this.snapshot, stale: true });
      this.schedule(Math.min(config.refreshMs, 60_000));
    } finally {
      this.refreshing = false;
    }
  }

  private publish(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}
