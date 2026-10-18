/**
 * When the week and team schedules read their games again.
 *
 * They follow the snapshot stream through `scoresVersion`: it has to move when
 * anything a reader sees on a game card moves, or a schedule sits on an old
 * score (2026-10-18), and stay put when nothing does, or every poll between
 * games costs each open schedule a request.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoresVersion } from "../client/src/lib/scoresVersion.js";
import type { PostseasonGame, ScoreboardGame, Snapshot } from "../client/src/lib/types.js";

function snapshot(games: Partial<ScoreboardGame>[], postseason: Partial<PostseasonGame>[] = []): Snapshot {
  const base = {
    week: 6,
    kickoff: "2026-10-18T17:00Z",
    state: "in" as const,
    statusDetail: "6:08 - 4th",
    home: "ATL",
    away: "CHI",
    homeScore: 15,
    awayScore: 31,
  };
  return {
    generatedAt: Date.now(),
    games: games.map((g, i) => ({ ...base, id: `g${i}`, ...g })),
    postseason: postseason.map((g, i) => ({ ...base, round: "wildcard" as const, id: `p${i}`, ...g })),
  } as unknown as Snapshot;
}

describe("the scores version", () => {
  it("stays put when a poll changes nothing on a card", () => {
    const before = snapshot([{}, { state: "pre", homeScore: 0, awayScore: 0 }]);
    const after = { ...snapshot([{}, { state: "pre", homeScore: 0, awayScore: 0 }]), generatedAt: before.generatedAt + 25_000 };
    assert.equal(scoresVersion(after), scoresVersion(before));
  });

  it("moves with a score", () => {
    assert.notEqual(scoresVersion(snapshot([{ homeScore: 22 }])), scoresVersion(snapshot([{}])));
  });

  it("moves with the clock, so a scoreless drive still shows", () => {
    assert.notEqual(scoresVersion(snapshot([{ statusDetail: "2:00 - 4th" }])), scoresVersion(snapshot([{}])));
  });

  it("moves when a game ends", () => {
    assert.notEqual(
      scoresVersion(snapshot([{ state: "post", statusDetail: "Final" }])),
      scoresVersion(snapshot([{}])),
    );
  });

  it("moves with a kickoff that was moved", () => {
    assert.notEqual(scoresVersion(snapshot([{ kickoff: "2026-10-19T00:20Z" }])), scoresVersion(snapshot([{}])));
  });

  it("moves with a playoff game too", () => {
    assert.notEqual(scoresVersion(snapshot([], [{ homeScore: 7 }])), scoresVersion(snapshot([], [{}])));
  });
});
