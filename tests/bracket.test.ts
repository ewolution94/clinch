/**
 * The bracket.
 *
 * Its one rule is that nothing is ever assumed: a team is placed by a game that
 * was played or by a pick the reader made, and by nothing else. The bracket
 * shipped once defaulting to chalk and filled the tree to the Super Bowl with
 * games nobody had played, which is the regression these tests exist to catch.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBracket, type Picks } from "../client/src/lib/bracket.js";
import type { ConferenceBracket } from "../client/src/lib/bracket.js";
import type { PostseasonGame } from "../client/src/lib/types.js";
import { buildConferences } from "../server/src/derive.js";
import { standings, type TeamSpec } from "./helpers.js";

/** A finished AFC table: seeds 1–7 are DEN, NE, JAX, PIT, HOU, LAC, BAL. */
const FIELD: TeamSpec[] = [
  { abbr: "DEN", wins: 14, losses: 3, seed: 1 },
  { abbr: "NE", wins: 13, losses: 4, seed: 2 },
  { abbr: "JAX", wins: 12, losses: 5, seed: 3 },
  { abbr: "PIT", wins: 11, losses: 6, seed: 4 },
  { abbr: "HOU", wins: 10, losses: 7, seed: 5 },
  { abbr: "LAC", wins: 10, losses: 7, seed: 6 },
  { abbr: "BAL", wins: 9, losses: 8, seed: 7 },
];

const conferences = () => buildConferences(standings(FIELD), []);

function bracket(played: PostseasonGame[] = [], picks: Picks = {}) {
  const built = buildBracket(conferences(), played, picks);
  const afc = built.conferences.find((c) => c.conference === "AFC");
  assert.ok(afc);
  return { all: built, afc };
}

function playoffGame(spec: Partial<PostseasonGame> & Pick<PostseasonGame, "round" | "home" | "away">): PostseasonGame {
  return {
    id: spec.id ?? `${spec.round}-${spec.home}-${spec.away}`,
    round: spec.round,
    kickoff: spec.kickoff ?? "2027-01-10T18:00:00Z",
    state: spec.state ?? "post",
    statusDetail: spec.statusDetail ?? "Final",
    home: spec.home,
    away: spec.away,
    homeScore: spec.homeScore ?? null,
    awayScore: spec.awayScore ?? null,
  };
}

/** The three wild card results, as games. Pass the winners' abbreviations. */
function wildCardResults(winners: { four5: string; three6: string; two7: string }): PostseasonGame[] {
  const pairs: [string, string, string][] = [
    ["PIT", "HOU", winners.four5],
    ["JAX", "LAC", winners.three6],
    ["NE", "BAL", winners.two7],
  ];
  return pairs.map(([home, away, winner]) =>
    playoffGame({
      round: "wildcard",
      home,
      away,
      homeScore: winner === home ? 27 : 17,
      awayScore: winner === away ? 27 : 17,
    }),
  );
}

describe("the wild card round", () => {
  it("draws 4v5, 3v6 and 2v7, top to bottom", () => {
    const { afc } = bracket();

    assert.deepEqual(
      afc.wildcard.map((m) => `${m.home?.seed}v${m.away?.seed}`),
      ["4v5", "3v6", "2v7"],
    );
  });

  it("gives the better seed the home slot", () => {
    const { afc } = bracket();

    for (const match of afc.wildcard) {
      assert.ok(match.home && match.away);
      assert.ok(match.home.seed < match.away.seed, `${match.home.abbr} hosts ${match.away.abbr}`);
    }
  });

  it("sits the 1 seed out", () => {
    const { afc } = bracket();

    assert.equal(afc.bye?.abbr, "DEN");
    assert.ok(
      afc.wildcard.every((m) => m.home?.abbr !== "DEN" && m.away?.abbr !== "DEN"),
      "the bye team does not play this round",
    );
  });
});

describe("with nothing played and nothing picked", () => {
  it("names no winners at all", () => {
    const { all, afc } = bracket();

    for (const match of afc.wildcard) {
      assert.equal(match.winner, null);
      assert.equal(match.decidedBy, null);
    }
    assert.equal(afc.champion, null);
    assert.equal(all.champion, null);
    assert.equal(all.superBowl?.winner, null);
  });

  it("seats the bye team in the divisional round anyway", () => {
    // A rule, not a prediction: a first-round bye means playing in this round.
    const { afc } = bracket();

    assert.equal(afc.divisional[0].home?.abbr, "DEN");
    assert.equal(afc.divisional[0].away, null);
    assert.equal(afc.divisional[0].awaySource, "Lowest survivor");
  });

  it("says where every empty slot's team will come from", () => {
    const { all, afc } = bracket();

    assert.equal(afc.divisional[1].homeSource, "Wild card winner");
    assert.equal(afc.championship?.homeSource, "Winner of Game 4");
    assert.equal(afc.championship?.awaySource, "Winner of Game 5");
    assert.equal(all.superBowl?.homeSource, "AFC champion");
    assert.equal(all.superBowl?.awaySource, "NFC champion");
  });
});

describe("the divisional round", () => {
  it("stays blank until the whole wild card weekend is in", () => {
    // Two of three results settle nothing: the 1 seed draws the lowest
    // remaining seed, which the third game could still change.
    const { afc } = bracket([], { "AFC-WC1": "PIT", "AFC-WC2": "JAX" });

    assert.equal(afc.wildcard[0].winner?.abbr, "PIT");
    assert.equal(afc.wildcard[1].winner?.abbr, "JAX");
    assert.equal(afc.divisional[0].away, null, "the bye team's opponent is not known yet");
    assert.equal(afc.divisional[1].home, null);
  });

  it("pairs the bye with the lowest survivor once all three are in", () => {
    const { afc } = bracket(wildCardResults({ four5: "PIT", three6: "JAX", two7: "NE" }));

    // Survivors 2, 3, 4 plus the bye: 1v4 and 2v3.
    assert.deepEqual(
      [afc.divisional[0].home?.abbr, afc.divisional[0].away?.abbr],
      ["DEN", "PIT"],
    );
    assert.deepEqual([afc.divisional[1].home?.abbr, afc.divisional[1].away?.abbr], ["NE", "JAX"]);
    assert.equal(afc.reseeded, false, "chalk needs no reseeding note");
  });

  it("follows the reseed after an upset, and says that it did", () => {
    // The 5 and 6 seeds win, so the lowest survivor is the 6 — not the team the
    // drawn line points at, which is the 4v5 winner.
    const { afc } = bracket(wildCardResults({ four5: "HOU", three6: "LAC", two7: "NE" }));

    assert.deepEqual([afc.divisional[0].home?.abbr, afc.divisional[0].away?.abbr], ["DEN", "LAC"]);
    assert.deepEqual([afc.divisional[1].home?.abbr, afc.divisional[1].away?.abbr], ["NE", "HOU"]);
    assert.equal(afc.reseeded, true, "the bracket's own lines no longer match the pairing");
  });
});

describe("results and picks", () => {
  it("takes a played result", () => {
    const [game] = wildCardResults({ four5: "HOU", three6: "JAX", two7: "NE" });
    const { afc } = bracket([game]);

    assert.equal(afc.wildcard[0].winner?.abbr, "HOU");
    assert.equal(afc.wildcard[0].decidedBy, "played");
    assert.deepEqual(afc.wildcard[0].score, { home: 17, away: 27 });
  });

  it("reads the score from the bracket's side, not the game's", () => {
    // ESPN's home team is not necessarily the bracket's, and a swapped score is
    // how a 30-3 win becomes a 3-30 loss.
    const swapped = playoffGame({
      round: "wildcard",
      home: "HOU",
      away: "PIT",
      homeScore: 30,
      awayScore: 3,
    });
    const { afc } = bracket([swapped]);

    assert.equal(afc.wildcard[0].home?.abbr, "PIT", "the 4 seed is home on the bracket");
    assert.deepEqual(afc.wildcard[0].score, { home: 3, away: 30 });
    assert.equal(afc.wildcard[0].winner?.abbr, "HOU");
  });

  it("takes a pick, and marks it as one", () => {
    const { afc } = bracket([], { "AFC-WC1": "HOU" });

    assert.equal(afc.wildcard[0].winner?.abbr, "HOU");
    assert.equal(afc.wildcard[0].decidedBy, "pick");
  });

  it("lets a result overrule a pick", () => {
    const [game] = wildCardResults({ four5: "PIT", three6: "JAX", two7: "NE" });
    const { afc } = bracket([game], { "AFC-WC1": "HOU" });

    assert.equal(afc.wildcard[0].winner?.abbr, "PIT");
    assert.equal(afc.wildcard[0].decidedBy, "played");
  });

  it("ignores a pick that no longer names a team in its match", () => {
    // Change something upstream and a stale pick simply stops counting, rather
    // than having to be cleared by hand.
    const { afc } = bracket([], { "AFC-WC1": "BUF" });

    assert.equal(afc.wildcard[0].winner, null);
    assert.equal(afc.wildcard[0].decidedBy, null);
  });

  it("leaves a drawn game undecided rather than picking a side", () => {
    const drawn = playoffGame({
      round: "wildcard",
      home: "PIT",
      away: "HOU",
      homeScore: 20,
      awayScore: 20,
    });
    const { afc } = bracket([drawn]);

    assert.equal(afc.wildcard[0].winner, null);
    assert.equal(afc.wildcard[0].decidedBy, null);
    assert.deepEqual(afc.wildcard[0].score, { home: 20, away: 20 });
  });

  it("does not let a result from another round settle a match", () => {
    const wrongRound = playoffGame({
      round: "divisional",
      home: "PIT",
      away: "HOU",
      homeScore: 30,
      awayScore: 3,
    });
    const { afc } = bracket([wrongRound]);

    assert.equal(afc.wildcard[0].winner, null);
    assert.equal(afc.wildcard[0].gameId, null);
  });
});

describe("opening a playoff game", () => {
  it("carries the game id once a real fixture exists", () => {
    const scheduled = playoffGame({
      id: "401700",
      round: "wildcard",
      home: "PIT",
      away: "HOU",
      state: "pre",
      statusDetail: "Sat 10:30",
    });
    const { afc } = bracket([scheduled]);

    // Unplayed, but it exists and is worth opening.
    assert.equal(afc.wildcard[0].gameId, "401700");
    assert.equal(afc.wildcard[0].winner, null);
  });

  it("has no game to open during the regular season", () => {
    const { afc } = bracket();
    assert.ok(
      afc.wildcard.every((m) => m.gameId === null),
      "these are projections from seeding, not fixtures",
    );
  });
});

describe("the whole way to the Super Bowl", () => {
  it("carries both champions into it", () => {
    const nfcField: TeamSpec[] = [
      { abbr: "SEA", wins: 14, losses: 3, seed: 1 },
      { abbr: "CHI", wins: 13, losses: 4, seed: 2 },
      { abbr: "PHI", wins: 12, losses: 5, seed: 3 },
      { abbr: "CAR", wins: 11, losses: 6, seed: 4 },
      { abbr: "LAR", wins: 10, losses: 7, seed: 5 },
      { abbr: "SF", wins: 10, losses: 7, seed: 6 },
      { abbr: "GB", wins: 9, losses: 8, seed: 7 },
    ];
    const both = buildConferences(standings([...FIELD, ...nfcField]), []);

    // Chalk all the way through, by pick, in both conferences.
    const picks: Picks = {
      "AFC-WC1": "PIT",
      "AFC-WC2": "JAX",
      "AFC-WC3": "NE",
      "AFC-DV1": "DEN",
      "AFC-DV2": "NE",
      "AFC-CF": "DEN",
      "NFC-WC1": "CAR",
      "NFC-WC2": "PHI",
      "NFC-WC3": "CHI",
      "NFC-DV1": "SEA",
      "NFC-DV2": "CHI",
      "NFC-CF": "SEA",
      SB: "SEA",
    };
    const built = buildBracket(both, [], picks);
    const afc = built.conferences.find((c: ConferenceBracket) => c.conference === "AFC");

    assert.equal(afc?.champion?.abbr, "DEN");
    assert.equal(built.superBowl?.home?.abbr, "DEN");
    assert.equal(built.superBowl?.away?.abbr, "SEA");
    assert.equal(built.champion?.abbr, "SEA");
  });
});
