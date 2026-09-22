/**
 * Seeding, clinching and elimination.
 *
 * This is the part of Clinch that is allowed to make a claim — "eliminated",
 * "clinched the division" — and the part that goes quiet for four months and
 * then has to be right in December. Two kinds of check:
 *
 *  - the finished 2025 season, read through the real ESPN response, as a whole
 *    table whose every label is known;
 *  - hand-built tables for the branches a finished season can't reach, because
 *    by January nothing is on the bubble any more.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { buildConferences, indexGamesByTeam, REGULAR_SEASON_GAMES } from "../server/src/derive.js";
import { fetchStandings } from "../server/src/espn.js";
import type { ConferenceView, TeamEntry } from "../server/src/types.js";
import { fixture, game, standings, stubFetch, type TeamSpec } from "./helpers.js";

let stub: { restore: () => void } | null = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

/** The 2025 table, taken through the same parser the live app uses. */
async function season2025(): Promise<ConferenceView[]> {
  stub = stubFetch([{ match: "standings", body: fixture("standings-2025.json") }]);
  const payload = await fetchStandings(2025, 5000);
  return buildConferences(payload, []);
}

const find = (conf: ConferenceView, abbr: string): TeamEntry => {
  const team = conf.seeds.find((t) => t.abbr === abbr);
  assert.ok(team, `${abbr} is in the ${conf.id}`);
  return team;
};

const statuses = (conf: ConferenceView) => Object.fromEntries(conf.seeds.map((t) => [t.abbr, t.status]));

describe("the finished 2025 season", () => {
  it("reads the payload ESPN actually returns", async () => {
    stub = stubFetch([{ match: "standings", body: fixture("standings-2025.json") }]);
    const payload = await fetchStandings(2025, 5000);

    assert.equal(payload.season, 2025);
    assert.equal(payload.seasonType, 2);
    assert.equal(payload.divisions.length, 8);
  });

  it("puts every playoff team in and everybody else out", async () => {
    const [afc, nfc] = await season2025();

    for (const conf of [afc, nfc]) {
      const labels = statuses(conf);
      const inField = conf.seeds.filter((t) => t.seed <= 7);
      const missed = conf.seeds.filter((t) => t.seed > 7);

      assert.equal(inField.length, 7);
      for (const team of inField) {
        assert.match(labels[team.abbr], /^clinched/, `${team.abbr} made the field`);
      }
      for (const team of missed) {
        assert.equal(labels[team.abbr], "eliminated", `${team.abbr} did not`);
      }
    }
  });

  it("gives the byes to the teams that earned them", async () => {
    const [afc, nfc] = await season2025();

    assert.equal(afc.byeTeam, "DEN");
    assert.equal(nfc.byeTeam, "SEA");
    assert.equal(find(afc, "DEN").status, "clinched-bye");
    assert.equal(find(nfc, "SEA").status, "clinched-bye");
    // Only one per conference, however good second place was.
    assert.equal(afc.seeds.filter((t) => t.status === "clinched-bye").length, 1);
    assert.equal(find(afc, "NE").status, "clinched-division");
  });

  it("seeds an 8-9 division winner above five better teams", async () => {
    // Carolina won the NFC South at 8-9 and hosted a playoff game; the Rams and
    // the 49ers went 12-5 and travelled. This is why a division winner is read
    // off its own division, never off the seed number.
    const [, nfc] = await season2025();
    const car = find(nfc, "CAR");

    assert.equal(car.record, "8-9");
    assert.equal(car.seed, 4);
    assert.equal(car.divisionRank, 1);
    assert.equal(car.status, "clinched-division");

    for (const abbr of ["LAR", "SF"]) {
      const team = find(nfc, abbr);
      assert.ok(team.seed > car.seed, `${abbr} is seeded below Carolina`);
      assert.equal(team.divisionRank > 1, true, `${abbr} did not win its division`);
      assert.equal(team.status, "clinched");
    }
  });

  it("counts a tie as half a win", async () => {
    // Green Bay finished 9-7-1 and took the last NFC place; Minnesota and
    // Detroit finished 9-8, which is half a game behind, not a whole one.
    const [, nfc] = await season2025();

    assert.equal(find(nfc, "GB").record, "9-7-1");
    assert.equal(find(nfc, "GB").seed, 7);
    assert.equal(find(nfc, "MIN").gamesBack, 0.5);
    assert.equal(find(nfc, "DET").gamesBack, 0.5);
    assert.equal(find(nfc, "GB").gamesAhead, 0.5);
  });

  it("separates two teams that finished level on ESPN's seed", async () => {
    // Denver and New England both finished 14-3. Neither floor clears the
    // other's ceiling, so the bye rests entirely on the season being over and
    // ESPN's seed — which has the real tiebreakers behind it — putting Denver
    // first. Without that branch there would be no bye at all.
    const [afc] = await season2025();

    assert.equal(find(afc, "DEN").record, "14-3");
    assert.equal(find(afc, "NE").record, "14-3");
    assert.equal(find(afc, "DEN").seed, 1);
    assert.equal(find(afc, "DEN").gamesRemaining, 0);
    assert.equal(find(afc, "DEN").status, "clinched-bye");
  });

  it("orders each division by seed, not by ESPN's own order", async () => {
    const [afc, nfc] = await season2025();

    // Worth knowing what is being corrected here: ESPN returns the AFC West as
    // LAC, KC, LV, DEN — the 14-3 division winner last — and the NFC West with
    // the 3-14 Cardinals third and 14-3 Seattle last.
    const afcWest = afc.divisions.find((d) => d.name === "West");
    assert.deepEqual(
      afcWest?.teams.map((t) => t.abbr),
      ["DEN", "LAC", "KC", "LV"],
    );

    const west = nfc.divisions.find((d) => d.name === "West");
    assert.deepEqual(
      west?.teams.map((t) => t.abbr),
      ["SEA", "LAR", "SF", "ARI"],
    );
    assert.deepEqual(
      west?.teams.map((t) => t.divisionRank),
      [1, 2, 3, 4],
    );
    // Three of the four in the field, and the division still reads in order.
    assert.deepEqual(
      afc.divisions.map((d) => d.name),
      ["East", "North", "South", "West"],
    );
  });

  it("draws the wild card round 2v7, 3v6, 4v5", async () => {
    const [afc] = await season2025();

    assert.deepEqual(
      afc.wildCardGames.map((m) => `${m.higherSeed}${m.higher}-${m.lowerSeed}${m.lower}`),
      ["2NE-7LAC", "3JAX-6BUF", "4PIT-5HOU"],
    );
    assert.ok(
      afc.wildCardGames.every((m) => m.round === "wildcard"),
      "the 1 seed is not in it",
    );
  });
});

describe("a season still being played", () => {
  /** Week 16: fifteen played, two to go — late enough for things to be settled. */
  const lateSeason: TeamSpec[] = [
    { abbr: "DEN", wins: 13, losses: 2, seed: 1 },
    { abbr: "NE", wins: 10, losses: 5, seed: 2 },
    { abbr: "JAX", wins: 10, losses: 5, seed: 3 },
    { abbr: "PIT", wins: 9, losses: 6, seed: 4 },
    { abbr: "HOU", wins: 9, losses: 6, seed: 5 },
    { abbr: "LAC", wins: 9, losses: 6, seed: 6 },
    { abbr: "BAL", wins: 8, losses: 7, seed: 7 },
    { abbr: "BUF", wins: 7, losses: 8, seed: 8 },
    { abbr: "IND", wins: 7, losses: 8, seed: 9 },
    { abbr: "KC", wins: 7, losses: 8, seed: 10 },
    { abbr: "CIN", wins: 6, losses: 9, seed: 11 },
    { abbr: "MIA", wins: 5, losses: 10, seed: 12 },
    { abbr: "LV", wins: 5, losses: 10, seed: 13 },
    { abbr: "CLE", wins: 4, losses: 11, seed: 14 },
    { abbr: "NYJ", wins: 3, losses: 12, seed: 15 },
    { abbr: "TEN", wins: 2, losses: 13, seed: 16 },
  ];

  /** Week 10: nine played, eight to go — nothing is settled yet. */
  const midSeason: TeamSpec[] = [
    { abbr: "DEN", wins: 8, losses: 1, seed: 1 },
    { abbr: "NE", wins: 7, losses: 2, seed: 2 },
    { abbr: "JAX", wins: 7, losses: 2, seed: 3 },
    { abbr: "PIT", wins: 6, losses: 3, seed: 4 },
    { abbr: "HOU", wins: 6, losses: 3, seed: 5 },
    { abbr: "LAC", wins: 6, losses: 3, seed: 6 },
    { abbr: "BAL", wins: 5, losses: 4, seed: 7 },
    { abbr: "KC", wins: 5, losses: 4, seed: 8 },
    { abbr: "BUF", wins: 4, losses: 5, seed: 9 },
    { abbr: "IND", wins: 3, losses: 6, seed: 10 },
    { abbr: "CIN", wins: 3, losses: 6, seed: 11 },
    { abbr: "MIA", wins: 2, losses: 7, seed: 12 },
    { abbr: "LV", wins: 1, losses: 8, seed: 13 },
    { abbr: "CLE", wins: 1, losses: 8, seed: 14 },
    { abbr: "NYJ", wins: 0, losses: 9, seed: 15 },
    { abbr: "TEN", wins: 0, losses: 9, seed: 16 },
  ];

  const afcFrom = (teams: TeamSpec[]) => buildConferences(standings(teams), [])[0];

  it("counts the games left from the games played", () => {
    const afc = afcFrom(lateSeason);
    assert.equal(find(afc, "DEN").gamesPlayed, 15);
    assert.equal(find(afc, "DEN").gamesRemaining, 2);
    assert.equal(REGULAR_SEASON_GAMES, 17);
  });

  it("calls a team in only when no outsider can catch it", () => {
    const afc = afcFrom(lateSeason);
    const labels = statuses(afc);

    // Denver's worst finish still beats everyone's best: bye, with two to play.
    assert.equal(labels.DEN, "clinched-bye");
    // New England's division rivals top out below its floor.
    assert.equal(labels.NE, "clinched-division");
    // Jacksonville is safe, but Houston can still take the South from it.
    assert.equal(labels.JAX, "clinched");
    // Everyone else in the field is only there for now.
    assert.equal(labels.PIT, "in");
    assert.equal(labels.HOU, "in");
    assert.equal(labels.BAL, "in");
  });

  it("calls a team out only when winning out is not enough", () => {
    const afc = afcFrom(lateSeason);
    const labels = statuses(afc);
    const cutFloor = find(afc, "BAL").wins;

    // Miami tops out at 7; the 7 seed cannot finish below 8.
    assert.equal(find(afc, "MIA").wins + find(afc, "MIA").gamesRemaining, 7);
    assert.equal(cutFloor, 8);
    assert.equal(labels.MIA, "eliminated");

    // Cincinnati tops out level with that floor, which is not behind it.
    assert.equal(find(afc, "CIN").wins + find(afc, "CIN").gamesRemaining, 8);
    assert.equal(labels.CIN, "hunt", "level is not eliminated");
  });

  it("ranks the chase by how far back it is", () => {
    const afc = afcFrom(midSeason);
    const labels = statuses(afc);

    assert.equal(find(afc, "KC").gamesBack, 0);
    assert.equal(labels.KC, "bubble");
    assert.equal(find(afc, "BUF").gamesBack, 1);
    assert.equal(labels.BUF, "bubble");
    assert.equal(find(afc, "IND").gamesBack, 2);
    assert.equal(labels.IND, "hunt");
    assert.equal(find(afc, "MIA").gamesBack, 3);
    assert.equal(labels.MIA, "hunt");
    assert.equal(find(afc, "LV").gamesBack, 4);
    assert.equal(labels.LV, "longshot");
  });

  it("eliminates nobody in November", () => {
    // With eight games left and the cut at 5-4, no team in the league is
    // mathematically out — and the page says so rather than guessing.
    const afc = afcFrom(midSeason);
    assert.equal(
      afc.seeds.filter((t) => t.status === "eliminated").length,
      0,
      "winless in week 10 is not eliminated",
    );
    assert.equal(statuses(afc).NYJ, "longshot");
  });

  it("counts a tie as half a win when deciding who is out", () => {
    // Miami at 5-9-1 tops out at 7½ with two to play, which is behind a 7 seed
    // that cannot finish below 8. Count the tie as a whole win and Miami tops
    // out level instead — and stays on the page as a team still in the hunt.
    const withTie = lateSeason.map((t) => (t.abbr === "MIA" ? { ...t, losses: 9, ties: 1 } : t));
    const afc = afcFrom(withTie);

    assert.equal(find(afc, "MIA").record, "5-9-1");
    assert.equal(find(afc, "MIA").gamesRemaining, 2, "a tie is still a game played");
    assert.equal(find(afc, "BAL").wins, 8, "and the 7 seed cannot finish below that");
    assert.equal(statuses(afc).MIA, "eliminated");
  });

  it("orders a division by the seed rather than by the record", () => {
    // Two teams level on record, seeded apart by tiebreakers ESPN has already
    // applied — and fed in the wrong order, as ESPN really does. Sorting by
    // wins would leave them as they came in; the seed is what settles it.
    const afc = afcFrom([
      { abbr: "NYJ", wins: 9, losses: 8, seed: 9 },
      { abbr: "BUF", wins: 9, losses: 8, seed: 5 },
      { abbr: "NE", wins: 9, losses: 8, seed: 12 },
      { abbr: "MIA", wins: 9, losses: 8, seed: 3 },
    ]);
    const east = afc.divisions.find((d) => d.name === "East");

    assert.deepEqual(
      east?.teams.map((t) => t.abbr),
      ["MIA", "BUF", "NYJ", "NE"],
    );
    assert.equal(east?.teams[0].divisionRank, 1, "and the leader is the one the seed names");
  });

  it("gives a team in the field no games back, and one outside no games ahead", () => {
    const afc = afcFrom(lateSeason);
    for (const team of afc.seeds) {
      if (team.seed <= 7) assert.equal(team.gamesBack, 0, `${team.abbr} is in the field`);
      else assert.equal(team.gamesAhead, 0, `${team.abbr} is not`);
    }
  });
});

describe("seeds ESPN hasn't assigned yet", () => {
  // Every September, before a team's first game, ESPN reports playoffSeed 0 —
  // which sorts above the entire conference unless it is handled.
  const preseason: TeamSpec[] = [
    { abbr: "DEN", wins: 1, losses: 0, seed: 1 },
    { abbr: "NE", wins: 1, losses: 0, seed: 2 },
    { abbr: "JAX", wins: 0, losses: 1, seed: 3 },
    { abbr: "PIT", wins: 0, losses: 0, seed: 0, pointDiff: 0 },
    { abbr: "BUF", wins: 0, losses: 0, seed: 0, pointDiff: 0 },
  ];

  it("slots an unranked team in by win differential instead of above everyone", () => {
    const afc = buildConferences(standings(preseason), [])[0];

    // A 0-0 team belongs between the winners and the loser, not at the top.
    assert.deepEqual(
      afc.seeds.map((t) => t.abbr),
      ["DEN", "NE", "BUF", "PIT", "JAX"],
    );
  });

  it("renumbers so the seeds stay contiguous", () => {
    const afc = buildConferences(standings(preseason), [])[0];
    assert.deepEqual(
      afc.seeds.map((t) => t.seed),
      [1, 2, 3, 4, 5],
    );
  });

  it("changes nothing once everyone has played", () => {
    const played = preseason.map((t, i) => ({ ...t, wins: 1, losses: 0, seed: i + 1 }));
    const afc = buildConferences(standings(played), [])[0];
    assert.deepEqual(
      afc.seeds.map((t) => `${t.seed}${t.abbr}`),
      ["1DEN", "2NE", "3JAX", "4PIT", "5BUF"],
    );
  });
});

describe("indexGamesByTeam", () => {
  it("records a finished game as a result for both sides", () => {
    const schedule = indexGamesByTeam([
      game({ home: "BUF", away: "NE", state: "post", homeScore: 24, awayScore: 17, week: 1 }),
    ]);

    assert.equal(schedule.get("BUF")?.played[0].result, "W");
    assert.equal(schedule.get("NE")?.played[0].result, "L");
    assert.equal(schedule.get("BUF")?.played[0].opponentScore, 17);
    assert.equal(schedule.get("NE")?.played[0].home, false);
  });

  it("records a drawn game as a tie for both sides", () => {
    const schedule = indexGamesByTeam([
      game({ home: "BUF", away: "NE", state: "post", homeScore: 20, awayScore: 20, week: 1 }),
    ]);

    assert.equal(schedule.get("BUF")?.played[0].result, "T");
    assert.equal(schedule.get("NE")?.played[0].result, "T");
  });

  it("does not count a game in progress as a win", () => {
    // A 10-3 lead in the second quarter is not a result, and showing it as one
    // is exactly what makes a standings page untrustworthy.
    const schedule = indexGamesByTeam([
      game({ home: "BUF", away: "NE", state: "in", homeScore: 10, awayScore: 3, week: 1 }),
    ]);

    assert.deepEqual(schedule.get("BUF")?.played, []);
    assert.equal(schedule.get("BUF")?.next?.opponent, "NE");
    assert.equal(schedule.get("BUF")?.next?.state, "in");
  });

  it("takes the next game in week order, not in list order", () => {
    const schedule = indexGamesByTeam([
      game({ id: "late", home: "BUF", away: "MIA", week: 5, kickoff: "2026-10-11T17:00:00Z" }),
      game({ id: "soon", home: "NYJ", away: "BUF", week: 3, kickoff: "2026-09-27T17:00:00Z" }),
    ]);

    assert.equal(schedule.get("BUF")?.next?.id, "soon");
  });

  it("keeps only the last five results as form", () => {
    const played = Array.from({ length: 7 }, (_, i) =>
      game({
        id: `w${i + 1}`,
        home: "BUF",
        away: "NE",
        week: i + 1,
        kickoff: `2026-09-${String(10 + i).padStart(2, "0")}T17:00:00Z`,
        state: "post",
        homeScore: i % 2 === 0 ? 24 : 10,
        awayScore: 17,
      }),
    );
    const schedule = indexGamesByTeam(played);

    assert.equal(schedule.get("BUF")?.played.length, 7);
    const conferences = buildConferences(standings([{ abbr: "BUF", wins: 4, losses: 3, seed: 1 }]), played);
    const buf = conferences[0].seeds[0];
    assert.equal(buf.form.length, 5);
    // Won weeks 1, 3, 5 and 7 — so the last five run from week 3 forward.
    assert.deepEqual(buf.form, ["W", "L", "W", "L", "W"]);
    assert.equal(buf.recent.length, 5);
  });
});
