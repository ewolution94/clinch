import { fetchScoreboard, fetchStandings } from "./espn.js";
import { buildConferences } from "./derive.js";
import { config } from "./config.js";
import type { ScoreboardGame, Snapshot } from "./types.js";

const REGULAR_SEASON_WEEKS = 18;

interface CachedWeek {
  games: ScoreboardGame[];
  fetchedAt: number;
  /** A week whose games have all finished never changes again. */
  settled: boolean;
}

const SEASON_TYPE_LABEL: Record<number, string> = { 1: "Preseason", 2: "Regular season", 3: "Postseason" };

export class SnapshotStore {
  private snapshot: Snapshot | null = null;
  private weeks = new Map<number, CachedWeek>();
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
    const cached = this.weeks.get(week);
    if (cached?.settled) return cached.games;
    if (cached && Date.now() - cached.fetchedAt < config.scheduleTtlMs) return cached.games;

    const payload = await fetchScoreboard({ season, seasonType: 2, week }, config.requestTimeoutMs);
    const settled = payload.games.length > 0 && payload.games.every((g) => g.state === "post");
    this.weeks.set(week, { games: payload.games, fetchedAt: Date.now(), settled });
    return payload.games;
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
        this.weeks.set(currentWeek, {
          games: live.games,
          fetchedAt: Date.now(),
          settled: live.games.length > 0 && live.games.every((g) => g.state === "post"),
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
      });

      this.schedule(anyLive ? config.liveRefreshMs : config.refreshMs);
    } catch (error) {
      console.error("[pylon] refresh failed:", error instanceof Error ? error.message : error);
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
