/**
 * The table as it would stand if the games being played ended now.
 *
 * The projection runs on the client, because shipping a second copy of the
 * conferences would nearly double every push during exactly the hours it
 * matters. That means the clinch arithmetic exists twice — once in
 * `server/src/derive.ts` and once in `client/src/lib/liveStandings.ts` — and
 * the last suite in this file is what stops the two drifting apart: it runs the
 * projection over games in progress, then has the *server* build the same
 * season from those games as finished results, and asserts the two tables are
 * identical. If someone changes one implementation and not the other, that test
 * goes red.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyLiveResults, hasLiveGames } from "../client/src/lib/liveStandings.js";
import { buildConferences } from "../server/src/derive.js";
import type { ConferenceView, TeamEntry } from "../client/src/lib/types.js";
import { game, standings, type TeamSpec } from "./helpers.js";

/** Nine AFC teams, mid-season: nine played, eight to go. */
const MID: TeamSpec[] = [
  { abbr: "DEN", wins: 7, losses: 2, seed: 1 },
  { abbr: "NE", wins: 6, losses: 3, seed: 2 },
  { abbr: "JAX", wins: 6, losses: 3, seed: 3 },
  { abbr: "PIT", wins: 5, losses: 4, seed: 4 },
  { abbr: "HOU", wins: 5, losses: 4, seed: 5 },
  { abbr: "LAC", wins: 5, losses: 4, seed: 6 },
  { abbr: "BAL", wins: 4, losses: 5, seed: 7 },
  { abbr: "BUF", wins: 4, losses: 5, seed: 8 },
  { abbr: "MIA", wins: 3, losses: 6, seed: 9 },
];

const afc = (specs: TeamSpec[] = MID): ConferenceView[] =>
  buildConferences(standings(specs), []) as unknown as ConferenceView[];

const find = (conf: ConferenceView, abbr: string): TeamEntry => {
  const team = conf.seeds.find((t) => t.abbr === abbr);
  assert.ok(team, `${abbr} is in the table`);
  return team;
};

/** A game in progress, with somebody ahead. */
const playing = (home: string, away: string, homeScore: number, awayScore: number) =>
  game({ home, away, state: "in", homeScore, awayScore });

describe("noticing that something is on", () => {
  it("sees a game in progress", () => {
    assert.equal(hasLiveGames([playing("BAL", "BUF", 17, 10)]), true);
  });

  it("does not count a game that hasn't kicked off, or one that is over", () => {
    assert.equal(hasLiveGames([game({ home: "BAL", away: "BUF" })]), false);
    assert.equal(
      hasLiveGames([game({ home: "BAL", away: "BUF", state: "post", homeScore: 17, awayScore: 10 })]),
      false,
    );
  });

  it("does not count a game in progress with no score on the board yet", () => {
    assert.equal(hasLiveGames([game({ home: "BAL", away: "BUF", state: "in" })]), false);
  });
});

describe("with nothing being played", () => {
  it("hands back the very same table", () => {
    const before = afc();
    // Identity, not a copy: the views below re-render if this object changes.
    assert.equal(applyLiveResults(before, []), before);
    assert.equal(applyLiveResults(before, [game({ home: "BAL", away: "BUF" })]), before);
  });

  it("does not fold in a game that has already finished", () => {
    // A final result is in the records ESPN sent. Counting it here too would
    // award the win twice.
    const before = afc();
    const finished = game({ home: "BAL", away: "BUF", state: "post", homeScore: 17, awayScore: 10 });

    assert.equal(applyLiveResults(before, [finished]), before);
  });
});

describe("folding a game in progress into a team's record", () => {
  it("counts the team in front as a win and the other as a loss", () => {
    const [conf] = applyLiveResults(afc(), [playing("BAL", "BUF", 17, 10)]);

    assert.equal(find(conf, "BAL").record, "5-5");
    assert.equal(find(conf, "BUF").record, "4-6");
  });

  it("counts a game level as a tie for both", () => {
    const [conf] = applyLiveResults(afc(), [playing("BAL", "BUF", 13, 13)]);

    assert.equal(find(conf, "BAL").record, "4-5-1");
    assert.equal(find(conf, "BUF").record, "4-5-1");
  });

  it("spends one of the games the team had left", () => {
    const before = afc();
    const [conf] = applyLiveResults(before, [playing("BAL", "BUF", 17, 10)]);

    assert.equal(find(before[0], "BAL").gamesRemaining, 8);
    assert.equal(find(conf, "BAL").gamesPlayed, 10);
    assert.equal(find(conf, "BAL").gamesRemaining, 7);
  });

  it("moves the points with the score", () => {
    const [conf] = applyLiveResults(afc(), [playing("BAL", "BUF", 17, 10)]);

    assert.equal(find(conf, "BAL").pointsFor, 17);
    assert.equal(find(conf, "BAL").pointsAgainst, 10);
    assert.equal(find(conf, "BAL").pointDiff, 7);
    assert.equal(find(conf, "BUF").pointDiff, -7);
  });

  it("carries the streak on, or breaks it", () => {
    const specs = MID.map((t) =>
      t.abbr === "BAL" ? { ...t, streak: "W2" } : t.abbr === "BUF" ? { ...t, streak: "W4" } : t,
    );
    const [conf] = applyLiveResults(afc(specs), [playing("BAL", "BUF", 17, 10)]);

    assert.equal(find(conf, "BAL").streak, "W3", "a third win in a row");
    assert.equal(find(conf, "BUF").streak, "L1", "and a run of four ends");
  });

  it("puts the game on the end of the last five — dots and list alike", () => {
    const [conf] = applyLiveResults(afc(), [playing("BAL", "BUF", 17, 10)]);
    const team = find(conf, "BAL");

    assert.equal(team.form.at(-1), "W");
    assert.ok(team.form.length <= 5);
    // Otherwise the row reads "5-5" above five results that don't include it.
    assert.equal(team.recent.at(-1)?.opponent, "BUF");
    assert.equal(team.recent.at(-1)?.result, "W");
    assert.equal(team.recent.at(-1)?.state, "in", "still being played");
    assert.equal(team.recent.at(-1)?.teamScore, 17);
    assert.ok(team.recent.length <= 5);
  });

  it("leaves every team that isn't playing alone", () => {
    const before = afc();
    const [conf] = applyLiveResults(before, [playing("BAL", "BUF", 17, 10)]);

    for (const abbr of ["DEN", "NE", "JAX", "MIA"]) {
      assert.equal(find(conf, abbr).record, find(before[0], abbr).record, abbr);
      assert.equal(find(conf, abbr).gamesPlayed, find(before[0], abbr).gamesPlayed, abbr);
    }
  });
});

describe("re-ranking on the projected records", () => {
  it("moves a team up when its record genuinely passes another's", () => {
    // Baltimore is the 7 seed at 4-5 and Houston the 5 at 5-4. Baltimore
    // winning and Houston losing puts both at 5-5 — and Baltimore, level,
    // stays *below*, because it was below. It takes a real pass to move.
    const [conf] = applyLiveResults(afc(), [
      playing("BAL", "BUF", 17, 10),
      playing("HOU", "MIA", 10, 21),
    ]);

    assert.equal(find(conf, "HOU").record, "5-5");
    assert.equal(find(conf, "BAL").record, "5-5");
    assert.ok(
      find(conf, "HOU").seed < find(conf, "BAL").seed,
      "level teams keep the order the tiebreakers already gave them",
    );
  });

  it("does move a team past one it has genuinely overtaken", () => {
    // Miami at 3-6 winning while Buffalo at 4-5 loses: 4-6 against 4-6 — level
    // again, so Buffalo stays ahead. Give Miami two more and it really passes.
    const climbing = MID.map((t) => (t.abbr === "MIA" ? { ...t, wins: 4, losses: 5 } : t));
    const [conf] = applyLiveResults(afc(climbing), [
      playing("MIA", "NE", 24, 21),
      playing("BUF", "JAX", 3, 30),
    ]);

    assert.equal(find(conf, "MIA").record, "5-5");
    assert.equal(find(conf, "BUF").record, "4-6");
    assert.ok(find(conf, "MIA").seed < find(conf, "BUF").seed, "Miami has actually passed Buffalo");
  });

  it("renumbers the seeds so they stay contiguous", () => {
    const [conf] = applyLiveResults(afc(), [playing("MIA", "DEN", 30, 3)]);

    assert.deepEqual(
      conf.seeds.map((t) => t.seed),
      conf.seeds.map((_, i) => i + 1),
    );
  });

  it("re-sorts each division and renumbers it", () => {
    // Miami has to genuinely overtake Buffalo, or the order never changes and
    // stale ranks would still read 1, 2, 3.
    const east = MID.map((t) =>
      t.abbr === "MIA" ? { ...t, wins: 4, losses: 5 } : t,
    );
    const [conf] = applyLiveResults(afc(east), [
      playing("MIA", "DEN", 28, 7),
      playing("BUF", "JAX", 3, 30),
    ]);
    const division = conf.divisions.find((d) => d.name === "East");

    assert.ok(division);
    assert.deepEqual(
      division.teams.map((t) => t.abbr),
      ["NE", "MIA", "BUF", "NYJ"].filter((a) => division.teams.some((t) => t.abbr === a)),
      "Miami has moved above Buffalo",
    );
    assert.deepEqual(
      division.teams.map((t) => t.divisionRank),
      division.teams.map((_, i) => i + 1),
    );
    for (let i = 1; i < division.teams.length; i += 1) {
      assert.ok(division.teams[i - 1].seed < division.teams[i].seed, "division reads in seed order");
    }
  });

  it("ranks on win percentage, not on games won", () => {
    // A team on its bye can sit above one with the same number of wins and a
    // game more played. Counting wins alone would swap them.
    const byeWeek: TeamSpec[] = [
      { abbr: "DEN", wins: 7, losses: 2, seed: 1 },
      { abbr: "NE", wins: 6, losses: 3, seed: 2 },
      { abbr: "JAX", wins: 5, losses: 3, seed: 3 },
      { abbr: "PIT", wins: 5, losses: 4, seed: 4 },
      { abbr: "HOU", wins: 4, losses: 5, seed: 5 },
      { abbr: "BAL", wins: 3, losses: 6, seed: 6 },
      { abbr: "LAC", wins: 3, losses: 6, seed: 7 },
      { abbr: "BUF", wins: 2, losses: 7, seed: 8 },
    ];
    // Pittsburgh wins and goes 6-4 (.600); Jacksonville is idle at 5-3 (.625).
    const [conf] = applyLiveResults(afc(byeWeek), [playing("PIT", "BUF", 24, 10)]);

    assert.equal(find(conf, "PIT").record, "6-4");
    assert.equal(find(conf, "JAX").record, "5-3");
    assert.ok(
      find(conf, "JAX").seed < find(conf, "PIT").seed,
      "the better percentage stays ahead, though it has fewer wins",
    );
  });

  it("keeps the whole order, not just the pair being looked at", () => {
    // Pins every position, so any reshuffle of teams that came out level is a
    // failure rather than something the next assertion happens to miss.
    const [conf] = applyLiveResults(afc(), [
      playing("BAL", "BUF", 17, 10),
      playing("HOU", "MIA", 10, 21),
    ]);

    // Los Angeles is not playing and holds .556; Houston loses and drops to
    // .500, so the 6 seed passes the 5 without kicking a ball.
    assert.deepEqual(
      conf.seeds.map((t) => t.abbr),
      ["DEN", "NE", "JAX", "PIT", "LAC", "HOU", "BAL", "BUF", "MIA"],
    );
  });

  it("hands the bye to whoever the projection puts top", () => {
    const [conf] = applyLiveResults(afc(), [playing("DEN", "NE", 0, 35)]);
    assert.equal(conf.byeTeam, conf.seeds[0].abbr);
  });
});

describe("agreeing with the server, exactly", () => {
  /** The fields both implementations are supposed to produce identically. */
  const table = (conf: ConferenceView) =>
    conf.seeds.map((t) => ({
      abbr: t.abbr,
      record: t.record,
      seed: t.seed,
      divisionRank: t.divisionRank,
      status: t.status,
      gamesBack: t.gamesBack,
      gamesAhead: t.gamesAhead,
      gamesPlayed: t.gamesPlayed,
      gamesRemaining: t.gamesRemaining,
      winPct: Number(t.winPct.toFixed(6)),
    }));

  /**
   * Runs one set of in-progress games both ways: projected by the client, and
   * built by the server from the same games as finished results. The seeds fed
   * to the server are the ones the projection arrived at, because ESPN's
   * tiebreakers are the one thing a projection cannot reproduce — everything
   * else is arithmetic, and has to match to the digit.
   */
  function bothWays(specs: TeamSpec[], results: [string, string, number, number][]) {
    const projected = applyLiveResults(
      afc(specs),
      results.map(([h, a, hs, as]) => playing(h, a, hs, as)),
    )[0];

    const outcome = new Map<string, "W" | "L" | "T">();
    for (const [home, away, hs, as] of results) {
      outcome.set(home, hs > as ? "W" : hs < as ? "L" : "T");
      outcome.set(away, hs > as ? "L" : hs < as ? "W" : "T");
    }
    const after = specs.map((t) => {
      const result = outcome.get(t.abbr);
      const seed = projected.seeds.find((s) => s.abbr === t.abbr)?.seed ?? t.seed;
      if (!result) return { ...t, seed };
      return {
        ...t,
        seed,
        wins: t.wins + (result === "W" ? 1 : 0),
        losses: t.losses + (result === "L" ? 1 : 0),
        ties: (t.ties ?? 0) + (result === "T" ? 1 : 0),
      };
    });

    return { projected, server: afc(after)[0] };
  }

  it("matches on a single game", () => {
    const { projected, server } = bothWays(MID, [["BAL", "BUF", 17, 10]]);
    assert.deepEqual(table(projected), table(server));
  });

  it("matches on a full Sunday", () => {
    const { projected, server } = bothWays(MID, [
      ["BAL", "BUF", 17, 10],
      ["HOU", "MIA", 10, 21],
      ["DEN", "NE", 3, 27],
      ["JAX", "PIT", 14, 14],
    ]);
    assert.deepEqual(table(projected), table(server));
  });

  it("matches when the projection settles a clinch", () => {
    // Late enough that a result actually changes a label rather than a number.
    const late: TeamSpec[] = [
      { abbr: "DEN", wins: 13, losses: 2, seed: 1 },
      { abbr: "NE", wins: 11, losses: 4, seed: 2 },
      { abbr: "JAX", wins: 10, losses: 5, seed: 3 },
      { abbr: "PIT", wins: 9, losses: 6, seed: 4 },
      { abbr: "HOU", wins: 9, losses: 6, seed: 5 },
      { abbr: "LAC", wins: 8, losses: 7, seed: 6 },
      { abbr: "BAL", wins: 8, losses: 7, seed: 7 },
      { abbr: "BUF", wins: 7, losses: 8, seed: 8 },
      { abbr: "MIA", wins: 5, losses: 10, seed: 9 },
      { abbr: "NYJ", wins: 4, losses: 11, seed: 10 },
    ];
    const { projected, server } = bothWays(late, [
      ["BAL", "BUF", 24, 3],
      ["MIA", "NYJ", 7, 20],
    ]);

    assert.deepEqual(table(projected), table(server));
    // And it is doing real work: somebody's label moved.
    const plain = afc(late)[0];
    assert.notDeepEqual(
      table(projected).map((r) => r.status),
      table(plain).map((r) => r.status),
    );
  });

  it("matches when a game in progress is level", () => {
    const { projected, server } = bothWays(MID, [["BAL", "BUF", 13, 13]]);
    assert.deepEqual(table(projected), table(server));
  });

  it("matches on the last Sunday, where the projection settles the season", () => {
    // Everyone has one game left, so the teams playing finish at 17 — and two
    // of them land level on the cut line. That is the case where a bare
    // ceiling-against-floor test says "on the bubble" about a season that is
    // over; `finishesAhead` uses the seed, because by then it has been decided.
    const lastWeek: TeamSpec[] = [
      { abbr: "DEN", wins: 13, losses: 3, seed: 1 },
      { abbr: "NE", wins: 12, losses: 4, seed: 2 },
      { abbr: "JAX", wins: 11, losses: 5, seed: 3 },
      { abbr: "PIT", wins: 10, losses: 6, seed: 4 },
      { abbr: "HOU", wins: 10, losses: 6, seed: 5 },
      { abbr: "LAC", wins: 9, losses: 7, seed: 6 },
      { abbr: "BAL", wins: 8, losses: 8, seed: 7 },
      { abbr: "BUF", wins: 9, losses: 7, seed: 8 },
      { abbr: "MIA", wins: 5, losses: 11, seed: 9 },
    ];
    const { projected, server } = bothWays(lastWeek, [
      ["BAL", "MIA", 27, 10],
      ["NE", "BUF", 30, 20],
    ]);

    assert.equal(projected.seeds.find((t) => t.abbr === "BAL")?.record, "9-8");
    assert.equal(projected.seeds.find((t) => t.abbr === "BUF")?.record, "9-8");
    assert.equal(projected.seeds.find((t) => t.abbr === "BAL")?.gamesRemaining, 0);
    assert.equal(
      projected.seeds.find((t) => t.abbr === "BUF")?.status,
      "eliminated",
      "level with the cut, and out of games",
    );
    assert.deepEqual(table(projected), table(server));
  });
});
