/**
 * Turns German TV listings into a per-game answer, cached in memory like
 * everything else here.
 *
 * The rule this file exists to protect: a game is only ever called unwatchable
 * when listings covering its day were actually published. Anything else is
 * `unknown`. Clinch under-claims everywhere else — it is late to call a team
 * eliminated rather than wrong — and a schedule that confidently says "not on"
 * because a scrape came back empty would be the same mistake in a new place.
 */
import { config } from "./config.js";
import { berlinDate, fetchDay, fetchRanWeek, type Listing, type RanWeek } from "./broadcast.js";
import type { GameBroadcast, Outlet, ScoreboardGame, WeekBroadcasts } from "./types.js";

interface CachedDay {
  listings: Listing[];
  published: boolean;
  fetchedAt: number;
}

/** Outlets TV Spielfilm lists. RTL+ is a stream, so it is never in a TV grid. */
const LINEAR: Outlet[] = ["RTL", "Nitro", "Sky"];

const MINUTE = 60_000;
/** How far either side of an unannounced slot a game counts as a contender. */
const SLOT_BEFORE = 30 * MINUTE;
const SLOT_AFTER = 60 * MINUTE;
/** A broadcast starts at most this far before kickoff, and never after it. */
const PREGAME_LEAD = 30 * MINUTE;
const PREGAME_TAIL = 6 * 60 * MINUTE;
/** Listings run ~14 days out; past that there is nothing to ask for. */
const HORIZON_MS = 16 * 24 * 60 * MINUTE;

function pair(a: string, b: string): string {
  return [a, b].sort().join("-");
}

/**
 * The listings day a kickoff belongs to. A German TV day runs past midnight, so
 * the Sunday-night game that kicks off at 02:20 on Monday is printed on Sunday's
 * page — reading Monday's would find nothing and call it unwatchable.
 */
function listingsDay(iso: string): string {
  const at = new Date(iso);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(at)
  );
  return berlinDate(hour < 5 ? new Date(at.getTime() - 24 * 60 * MINUTE) : at);
}

class BroadcastStore {
  private days = new Map<string, CachedDay>();
  private ran: { data: RanWeek; fetchedAt: number } | null = null;

  private async day(date: string, outlet: Outlet): Promise<CachedDay> {
    const key = `${outlet}:${date}`;
    const cached = this.days.get(key);
    if (cached && Date.now() - cached.fetchedAt < config.broadcastTtlMs) return cached;

    try {
      const { listings, published } = await fetchDay(date, outlet, config.requestTimeoutMs);
      const fresh = { listings, published, fetchedAt: Date.now() };
      this.days.set(key, fresh);
      return fresh;
    } catch {
      // Keep serving a stale day rather than downgrading it to "unknown".
      if (cached) return cached;
      const empty = { listings: [], published: false, fetchedAt: Date.now() };
      this.days.set(key, empty);
      return empty;
    }
  }

  private async ranWeek(): Promise<RanWeek | null> {
    if (this.ran && Date.now() - this.ran.fetchedAt < config.broadcastTtlMs) return this.ran.data;
    try {
      const data = await fetchRanWeek(config.requestTimeoutMs);
      this.ran = { data, fetchedAt: Date.now() };
      return data;
    } catch {
      return this.ran?.data ?? null;
    }
  }

  /**
   * Annotates a week in place of nothing — the games are returned unchanged if
   * anything at all goes wrong, and the caller renders exactly as it did before
   * this feature existed.
   */
  async annotate(
    week: number,
    games: ScoreboardGame[]
  ): Promise<{ games: ScoreboardGame[]; broadcasts?: WeekBroadcasts }> {
    const upcoming = games.filter((g) => g.state !== "post");
    if (!config.broadcasts || upcoming.length === 0) return { games };

    const outlets = config.outlets;
    const linear = LINEAR.filter((o) => outlets.includes(o));
    const kickoffs = upcoming.map((g) => Date.parse(g.kickoff)).filter(Number.isFinite);
    if (kickoffs.length === 0) return { games };

    const published = new Set<string>();
    const listings: Listing[] = [];

    // Nothing to ask for beyond the horizon; the whole week is simply unknown.
    const inHorizon = Math.min(...kickoffs) - Date.now() < HORIZON_MS;
    if (inHorizon) {
      const dates = [...new Set(upcoming.map((g) => listingsDay(g.kickoff)))].sort();
      const fetched = await Promise.all(
        linear.flatMap((outlet) => dates.map(async (d) => ({ d, ...(await this.day(d, outlet)) })))
      );
      for (const day of fetched) {
        if (day.published) published.add(day.d);
        listings.push(...day.listings);
      }
    }

    const broadcast = new Map<string, GameBroadcast>();
    const add = (id: string, outlet: Outlet, startsAt: string) => {
      const existing = broadcast.get(id);
      if (existing?.status === "confirmed") {
        if (!existing.slots.some((s) => s.outlet === outlet)) existing.slots.push({ outlet, startsAt });
        return;
      }
      broadcast.set(id, {
        status: "confirmed",
        slots: [{ outlet, startsAt }],
        contenders: null,
        pendingOutlet: null,
      });
    };

    // 1. Named linear broadcasts. The team pair identifies the game; the time is
    //    only a guard against a repeat of a game played weeks ago.
    for (const listing of listings) {
      if (listing.teams.length !== 2) continue;
      const key = pair(listing.teams[0], listing.teams[1]);
      const start = Date.parse(listing.startsAt);
      const game = upcoming.find((g) => {
        if (pair(g.home, g.away) !== key) return false;
        const kick = Date.parse(g.kickoff);
        return kick >= start - PREGAME_LEAD && kick <= start + PREGAME_TAIL;
      });
      if (game) add(game.id, listing.outlet, listing.startsAt);
    }

    // 2. The RTL+ stream, which is in no TV grid at all. ran.joyn only ever
    //    describes the current week, so it is ignored for every other one.
    if (inHorizon && outlets.some((o) => !LINEAR.includes(o))) {
      const ran = await this.ranWeek();
      if (ran && ran.week === week) {
        for (const entry of ran.entries) {
          const wanted = entry.outlets.filter((o) => outlets.includes(o) && !LINEAR.includes(o));
          if (wanted.length === 0) continue;
          // One name is enough: within a week a team plays exactly once. That
          // matters because this source is hand-written and misspells cities.
          // More than two names means the prose ran two fixtures together, and
          // guessing which pair was meant is how a badge ends up on the wrong
          // game — so that block is dropped rather than resolved.
          if (entry.teams.length > 2) continue;
          const candidates =
            entry.teams.length === 2
              ? upcoming.filter((g) => pair(g.home, g.away) === pair(entry.teams[0], entry.teams[1]))
              : upcoming.filter((g) => g.home === entry.teams[0] || g.away === entry.teams[0]);
          if (candidates.length !== 1) continue;
          const game = candidates[0];
          for (const outlet of wanted) add(game.id, outlet, game.kickoff);
        }
      }
    }

    // 3. Slots whose matchup RTL hasn't picked yet: every game in the window is
    //    still in the running, and the card says so rather than "not on".
    for (const listing of listings) {
      if (listing.teams.length === 2) continue;
      const start = Date.parse(listing.startsAt);
      if (!Number.isFinite(start)) continue;
      const contenders = upcoming.filter((g) => {
        if (broadcast.get(g.id)?.status === "confirmed") return false;
        const kick = Date.parse(g.kickoff);
        return kick >= start - SLOT_BEFORE && kick <= start + SLOT_AFTER;
      });
      for (const game of contenders) {
        if (broadcast.has(game.id)) continue;
        broadcast.set(game.id, {
          status: "candidate",
          slots: [],
          contenders: contenders.length,
          pendingOutlet: listing.outlet,
        });
      }
    }

    // 4. Everything else is only "not on" where the day was actually published.
    const annotated = games.map((game) => {
      if (game.state === "post") return game;
      const found = broadcast.get(game.id);
      if (found) return { ...game, broadcast: found };
      const known = published.has(listingsDay(game.kickoff));
      return {
        ...game,
        broadcast: {
          status: known ? ("unavailable" as const) : ("unknown" as const),
          slots: [],
          contenders: null,
          pendingOutlet: null,
        },
      };
    });

    const statuses = [...broadcast.values()];
    return {
      games: annotated,
      broadcasts: {
        published: published.size > 0,
        confirmed: statuses.filter((b) => b.status === "confirmed").length,
        candidates: statuses.filter((b) => b.status === "candidate").length,
        upcoming: upcoming.length,
        outlets,
        checkedAt: Date.now(),
      },
    };
  }
}

export const broadcastStore = new BroadcastStore();
