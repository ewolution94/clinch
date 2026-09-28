/**
 * One team's season, assembled from the week cache.
 *
 * The interesting part is that every game has to be turned *around* to face the
 * chosen team: the same fixture is a home win for one side and an away loss for
 * the other, and getting that backwards would put the wrong score against the
 * wrong team for seventeen rows at a time.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { scoreboard } from "./helpers.js";
import type { TeamSchedule } from "../server/src/types.js";

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

/** A store with an empty week cache, so one test can't answer another's. */
let instance = 0;
async function freshStore() {
  instance += 1;
  const mod = await import(`../server/src/snapshotStore.js?case=${instance}`);
  return new mod.SnapshotStore() as {
    teamSchedule: (abbr: string) => Promise<TeamSchedule>;
  };
}

interface Fixture {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  state?: "pre" | "in" | "post";
}

/**
 * Serves a scoreboard per week from a plan, and nothing for a week the plan
 * leaves out — which is how a bye is expressed.
 */
function serveWeeks(plan: Record<number, Fixture[]>, options: { failWeek?: number } = {}) {
  const original = globalThis.fetch;
  const asked: number[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.includes("/scoreboard")) return new Response("{}", { status: 200 });

    const params = new URL(url).searchParams;
    const week = Number(params.get("week") ?? 1);
    const seasonType = Number(params.get("seasontype") ?? 2);
    asked.push(week);
    if (options.failWeek === week) return new Response("upstream is down", { status: 503 });

    const games = (plan[week] ?? []).map((f, i) => ({
      id: `w${week}g${i}`,
      home: f.home,
      away: f.away,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      state: f.state ?? "post",
    }));
    return new Response(
      scoreboard({ season: 2026, seasonType, week, games: games as never }),
      { status: 200 },
    );
  }) as typeof fetch;

  restore = () => {
    globalThis.fetch = original;
  };
  return { asked };
}

describe("turning a game around to face one team", () => {
  it("reads a home win as a win, with the scores its way round", async () => {
    serveWeeks({ 1: [{ home: "BUF", away: "NE", homeScore: 31, awayScore: 17 }] });
    const store = await freshStore();
    const schedule = await store.teamSchedule("BUF");
    const [game] = schedule.games;

    assert.equal(game.opponent, "NE");
    assert.equal(game.home, true);
    assert.equal(game.result, "W");
    assert.equal(game.teamScore, 31);
    assert.equal(game.opponentScore, 17);
  });

  it("reads the same game as an away loss for the other side", async () => {
    serveWeeks({ 1: [{ home: "BUF", away: "NE", homeScore: 31, awayScore: 17 }] });
    const store = await freshStore();
    const [game] = (await store.teamSchedule("NE")).games;

    assert.equal(game.opponent, "BUF");
    assert.equal(game.home, false);
    assert.equal(game.result, "L");
    assert.equal(game.teamScore, 17, "its own score first, whichever side it was on");
    assert.equal(game.opponentScore, 31);
  });

  it("calls a level game a tie for both", async () => {
    serveWeeks({ 1: [{ home: "BUF", away: "NE", homeScore: 20, awayScore: 20 }] });
    const store = await freshStore();

    assert.equal((await store.teamSchedule("BUF")).games[0].result, "T");
    assert.equal((await store.teamSchedule("NE")).games[0].result, "T");
  });

  it("has no result for a game that hasn't finished", async () => {
    serveWeeks({
      1: [{ home: "BUF", away: "NE", homeScore: 10, awayScore: 3, state: "in" }],
      2: [{ home: "BUF", away: "MIA", homeScore: 0, awayScore: 0, state: "pre" }],
    });
    const store = await freshStore();
    const schedule = await store.teamSchedule("BUF");

    assert.equal(schedule.games[0].result, null, "a lead is not a win");
    assert.equal(schedule.games[1].result, null);
    assert.equal(schedule.record, "0-0", "and neither counts towards the record");
  });
});

describe("the season as a whole", () => {
  const season: Record<number, Fixture[]> = {
    1: [{ home: "BUF", away: "NE", homeScore: 31, awayScore: 17 }],
    2: [{ home: "MIA", away: "BUF", homeScore: 24, awayScore: 20 }],
    3: [{ home: "BUF", away: "NYJ", homeScore: 27, awayScore: 27 }],
    // No week 4 — that is the bye.
    5: [{ home: "NE", away: "BUF", homeScore: 10, awayScore: 30 }],
  };

  it("keeps the games in the order they are played", async () => {
    serveWeeks(season);
    const store = await freshStore();
    const schedule = await store.teamSchedule("BUF");

    assert.deepEqual(
      schedule.games.map((g) => g.week),
      [1, 2, 3, 5],
    );
    assert.deepEqual(
      schedule.games.map((g) => g.opponent),
      ["NE", "MIA", "NYJ", "NE"],
    );
  });

  it("finds the bye in the gap", async () => {
    serveWeeks(season);
    const store = await freshStore();

    assert.equal((await store.teamSchedule("BUF")).byeWeek, 4);
  });

  it("counts the record from the games that were played", async () => {
    serveWeeks(season);
    const store = await freshStore();

    // Won weeks 1 and 5, lost week 2, tied week 3.
    assert.equal((await store.teamSchedule("BUF")).record, "2-1-1");
  });

  it("names each week the way the season's own calendar does", async () => {
    serveWeeks(season);
    const store = await freshStore();
    const schedule = await store.teamSchedule("BUF");

    assert.equal(schedule.games[0].label, "Week 1");
    assert.equal(schedule.games[3].label, "Week 5");
  });

  it("leaves out a week that could not be read, rather than failing the season", async () => {
    // A schedule with a gap is still a schedule; no schedule at all is not.
    serveWeeks(season, { failWeek: 2 });
    const store = await freshStore();
    const schedule = await store.teamSchedule("BUF");

    assert.deepEqual(
      schedule.games.map((g) => g.week),
      [1, 3, 5],
    );
    assert.equal(schedule.team, "BUF");
  });

  it("reads every week of the season, a few at a time", async () => {
    const { asked } = serveWeeks(season);
    const store = await freshStore();
    await store.teamSchedule("BUF");

    // All eighteen, and none of them twice.
    assert.deepEqual([...new Set(asked)].sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i + 1));
    assert.equal(asked.length, 18, "each week fetched once");
  });

  it("serves a second team from the weeks already read", async () => {
    const { asked } = serveWeeks(season);
    const store = await freshStore();
    await store.teamSchedule("BUF");
    const first = asked.length;
    const other = await store.teamSchedule("NE");

    assert.equal(asked.length, first, "the cache answers the second team");
    assert.deepEqual(
      other.games.map((g) => g.week),
      [1, 5],
    );
  });
});
