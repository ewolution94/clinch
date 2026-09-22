/**
 * "Can I watch this?" — the four answers.
 *
 * `confirmed`, `candidate`, `unavailable`, `unknown`. RTL names its Sunday
 * picks about a week out, so "this is not on" and "nobody has announced this
 * yet" are both common and completely different, and collapsing them to a
 * boolean is the one change that would make the feature dishonest.
 *
 * The listings markup itself is checked in `broadcast.test.ts` against saved
 * pages. What is built here is the same shape, so these tests can say what is
 * on and when, which a frozen page cannot.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { ScoreboardGame } from "../server/src/types.js";
import { game, stubFetch } from "./helpers.js";

let stub: { restore: () => void; urls: string[] } | null = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

/** A store with empty caches, so one test's listings can't answer another's. */
let instance = 0;
async function freshStore() {
  instance += 1;
  const mod = await import(`../server/src/broadcastStore.js?case=${instance}`);
  return mod.broadcastStore as {
    annotate: (
      week: number,
      games: ScoreboardGame[],
    ) => Promise<{ games: ScoreboardGame[]; broadcasts?: { published: boolean; confirmed: number; candidates: number; upcoming: number } }>;
  };
}

/* ------------------------------------------------------------------- pages */

const BERLIN = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * TV Spielfilm stamps its times with a `+00:00` it does not mean — the field is
 * a German wall clock. So a listing for a kickoff is that kickoff, read in
 * Berlin and written back out with the offset it claims.
 */
function berlinStamp(iso: string): string {
  return `${BERLIN.format(new Date(iso)).replace(" ", "T")}:00+00:00`;
}

function anchor(title: string, broadcastTime: string, channel = "RTL"): string {
  const point = JSON.stringify({
    channel,
    category1: "American Football",
    broadcastTime,
  });
  return `<a href="https://www.tvspielfilm.de/tv-programm/sendung/x,1.html" title="${title}" data-tracking-point='${point}'>`;
}

/** A day's page. An empty list still counts as published — a Tuesday is a Tuesday. */
function day(...anchors: string[]): string {
  return `<html><body>${anchor("RTL Aktuell", "2026-01-01T18:45:00+00:00").replace(
    '"category1":"American Football"',
    '"category1":"Nachrichten"',
  )}${anchors.join("")}</body></html>`;
}

const named = (away: string, home: string, iso: string) =>
  anchor(`American Football: NFL Week 3: ${home} – ${away}`, berlinStamp(iso));

const unnamedSlot = (iso: string) => anchor("American Football: NFL", berlinStamp(iso));

/** An ISO stamp `days` out at a given UTC hour — inside the listings horizon. */
function kickoff(days: number, hour = 17, minute = 0): string {
  const at = new Date(Date.now() + days * 86_400_000);
  at.setUTCHours(hour, minute, 0, 0);
  return at.toISOString();
}

const dateParam = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const broadcastOf = (result: { games: ScoreboardGame[] }, id: string) =>
  result.games.find((g) => g.id === id)?.broadcast;

describe("a game named in the listings", () => {
  it("is confirmed, with the channel and when to turn it on", async () => {
    const at = kickoff(3);
    stub = stubFetch([{ match: "tvspielfilm", body: day(named("Jacksonville Jaguars", "New England Patriots", at)) }]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);
    const found = broadcastOf(result, "a");

    assert.equal(found?.status, "confirmed");
    assert.deepEqual(found?.slots.map((s) => s.outlet), ["RTL"]);
    assert.equal(found?.slots[0].startsAt, at);
  });

  it("is matched on the pair of teams, whichever way round the listing writes them", async () => {
    const at = kickoff(3);
    // Written away-first here; ESPN says New England is at home.
    stub = stubFetch([
      { match: "tvspielfilm", body: day(anchor("American Football: NFL: Jacksonville Jaguars at New England Patriots", berlinStamp(at))) },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);

    assert.equal(broadcastOf(result, "a")?.status, "confirmed");
  });

  it("is not confused with the same fixture played weeks earlier", async () => {
    // The time is a guard against exactly this: the pair identifies the game,
    // but the same two teams can meet twice in a season.
    const at = kickoff(3);
    const listedFor = kickoff(10);
    stub = stubFetch([{ match: "tvspielfilm", body: day(named("Jacksonville Jaguars", "New England Patriots", listedFor)) }]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);

    assert.notEqual(broadcastOf(result, "a")?.status, "confirmed");
  });

  it("looks at the day the listings print it on, not the day it kicks off", async () => {
    // The Sunday-night game kicks off after midnight and is printed on
    // Sunday's page. Only that day is served here, so asking for Monday finds
    // nothing and the game reads as unwatchable.
    const at = kickoff(3, 0, 20);
    const printedOn = dateParam(kickoff(2, 12));
    stub = stubFetch([
      { match: `date=${printedOn}`, body: day(named("Los Angeles Rams", "Denver Broncos", at)) },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "sn", home: "DEN", away: "LAR", kickoff: at })]);

    assert.equal(broadcastOf(result, "sn")?.status, "confirmed");
  });
});

describe("a slot whose matchup has not been announced", () => {
  it("leaves every game in the window in the running", async () => {
    const at = kickoff(4);
    stub = stubFetch([{ match: "tvspielfilm", body: day(unnamedSlot(at)) }]);

    const store = await freshStore();
    const result = await store.annotate(3, [
      game({ id: "a", home: "NE", away: "JAX", kickoff: at }),
      game({ id: "b", home: "BUF", away: "MIA", kickoff: at }),
    ]);

    for (const id of ["a", "b"]) {
      const found = broadcastOf(result, id);
      assert.equal(found?.status, "candidate", `${id} is still in the running`);
      assert.equal(found?.contenders, 2);
      assert.equal(found?.pendingOutlet, "RTL");
      assert.deepEqual(found?.slots, []);
    }
  });

  it("does not put a game already confirmed back in the running", async () => {
    const at = kickoff(4);
    stub = stubFetch([
      {
        match: "tvspielfilm",
        body: day(named("Miami Dolphins", "Buffalo Bills", at), unnamedSlot(at)),
      },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [
      game({ id: "a", home: "NE", away: "JAX", kickoff: at }),
      game({ id: "b", home: "BUF", away: "MIA", kickoff: at }),
    ]);

    assert.equal(broadcastOf(result, "b")?.status, "confirmed");
    assert.equal(broadcastOf(result, "a")?.status, "candidate");
    assert.equal(broadcastOf(result, "a")?.contenders, 1, "the confirmed game is no longer a contender");
  });

  it("does not reach games hours away from the slot", async () => {
    const slot = kickoff(4, 17);
    const far = kickoff(4, 23);
    stub = stubFetch([{ match: "tvspielfilm", body: day(unnamedSlot(slot)) }]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "far", home: "NE", away: "JAX", kickoff: far })]);

    assert.equal(broadcastOf(result, "far")?.status, "unavailable");
  });
});

describe("a game in nobody's listings", () => {
  it("is only called unwatchable when the day was actually published", async () => {
    const at = kickoff(3);
    stub = stubFetch([{ match: "tvspielfilm", body: day(named("Miami Dolphins", "Buffalo Bills", at)) }]);

    const store = await freshStore();
    const result = await store.annotate(3, [
      game({ id: "shown", home: "BUF", away: "MIA", kickoff: at }),
      game({ id: "not", home: "NE", away: "JAX", kickoff: at }),
    ]);

    assert.equal(broadcastOf(result, "not")?.status, "unavailable");
  });

  it("is unknown when the page came back without the channel on it", async () => {
    // What a date past the listings horizon actually answers: somebody else's
    // grid. Nothing can be concluded from it.
    const at = kickoff(3);
    stub = stubFetch([
      { match: "tvspielfilm", body: `<html><body>${anchor("Tagesschau", "2026-01-01T20:00:00+00:00", "ARD")}</body></html>` },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);

    assert.equal(broadcastOf(result, "a")?.status, "unknown");
  });

  it("is unknown when the listings could not be fetched at all", async () => {
    const at = kickoff(3);
    stub = stubFetch([{ match: "tvspielfilm", body: "upstream is down", status: 503 }]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);

    assert.equal(broadcastOf(result, "a")?.status, "unknown", "a failed scrape is not an empty schedule");
  });

  it("is unknown past the horizon, without asking anybody", async () => {
    const at = kickoff(40);
    stub = stubFetch([{ match: "tvspielfilm", body: day() }]);

    const store = await freshStore();
    const result = await store.annotate(12, [game({ id: "a", home: "NE", away: "JAX", kickoff: at })]);

    assert.equal(broadcastOf(result, "a")?.status, "unknown");
    assert.equal(stub.urls.length, 0, "nothing is published that far ahead — don't ask");
    assert.equal(result.broadcasts?.published, false);
  });
});

describe("the RTL+ stream", () => {
  const ranPage = (rows: string[]) =>
    `<html><head><title>… in Woche 3 gezeigt</title></head><body>${rows.map((r) => `<p>${r}</p>`).join("")}</body></html>`;

  it("comes from ran.joyn, since it is in no TV grid", async () => {
    const at = kickoff(3);
    stub = stubFetch([
      { match: "tvspielfilm", body: day() },
      { match: "ran.joyn", body: ranPage(["20. September, 19:00 Uhr: Cincinnati Bengals at Houston Texans (Pay-Livestream/RTL+)"]) },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "HOU", away: "CIN", kickoff: at })]);
    const found = broadcastOf(result, "a");

    assert.equal(found?.status, "confirmed");
    assert.deepEqual(found?.slots.map((s) => s.outlet), ["RTL+"]);
  });

  it("is ignored for any week but the one the page describes", async () => {
    // ran.joyn only ever writes about the current week, so applying its table
    // to another one would put a badge on the wrong game.
    const at = kickoff(3);
    stub = stubFetch([
      { match: "tvspielfilm", body: day() },
      { match: "ran.joyn", body: ranPage(["Cincinnati Bengals at Houston Texans (Pay-Livestream/RTL+)"]) },
    ]);

    const store = await freshStore();
    const result = await store.annotate(9, [game({ id: "a", home: "HOU", away: "CIN", kickoff: at })]);

    assert.notEqual(broadcastOf(result, "a")?.status, "confirmed");
  });

  it("resolves a game from one team, since a team plays once a week", async () => {
    const at = kickoff(3);
    stub = stubFetch([
      { match: "tvspielfilm", body: day() },
      // As the live page misspells it.
      { match: "ran.joyn", body: ranPage(["New York Giants at Los Ageles Rams (Pay-Livestream/RTL+)"]) },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [game({ id: "a", home: "LAR", away: "NYG", kickoff: at })]);

    assert.equal(broadcastOf(result, "a")?.status, "confirmed");
  });

  it("drops a block that ran two fixtures together", async () => {
    // Three or more names means guessing which pair was meant. Resolving it
    // from the first name found would put the badge on Buffalo's game, which
    // this block does not describe at all — the wrong game, confidently.
    const at = kickoff(3);
    stub = stubFetch([
      { match: "tvspielfilm", body: day() },
      {
        match: "ran.joyn",
        body: ranPage(["Cincinnati Bengals at Houston Texans und Buffalo Bills (Pay-Livestream/RTL+)"]),
      },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [
      game({ id: "meant", home: "HOU", away: "CIN", kickoff: at }),
      game({ id: "bystander", home: "BUF", away: "MIA", kickoff: at }),
    ]);

    assert.notEqual(broadcastOf(result, "meant")?.status, "confirmed");
    assert.notEqual(
      broadcastOf(result, "bystander")?.status,
      "confirmed",
      "a game the block never described must not get the badge",
    );
  });
});

describe("the week's summary", () => {
  it("counts what was found, and says whether anything was published", async () => {
    const at = kickoff(3);
    stub = stubFetch([
      {
        match: "tvspielfilm",
        body: day(named("Miami Dolphins", "Buffalo Bills", at), unnamedSlot(at)),
      },
    ]);

    const store = await freshStore();
    const result = await store.annotate(3, [
      game({ id: "a", home: "BUF", away: "MIA", kickoff: at }),
      game({ id: "b", home: "NE", away: "JAX", kickoff: at }),
      game({ id: "done", home: "DEN", away: "KC", kickoff: at, state: "post", homeScore: 20, awayScore: 17 }),
    ]);

    assert.equal(result.broadcasts?.published, true);
    assert.equal(result.broadcasts?.confirmed, 1);
    assert.equal(result.broadcasts?.candidates, 1);
    assert.equal(result.broadcasts?.upcoming, 2, "a played game is not upcoming");
  });

  it("leaves a played game exactly as it was", async () => {
    const at = kickoff(-3);
    stub = stubFetch([{ match: "tvspielfilm", body: day() }]);

    const store = await freshStore();
    const played = game({ id: "done", home: "DEN", away: "KC", kickoff: at, state: "post", homeScore: 20, awayScore: 17 });
    const result = await store.annotate(3, [played]);

    assert.equal(result.games[0].broadcast, undefined, "nobody needs a channel for a game that is over");
    assert.deepEqual(result.games[0], played);
  });

  it("returns the games untouched when there is nothing upcoming", async () => {
    stub = stubFetch([{ match: "tvspielfilm", body: day() }]);

    const store = await freshStore();
    const played = [game({ id: "done", home: "DEN", away: "KC", state: "post", homeScore: 20, awayScore: 17 })];
    const result = await store.annotate(3, played);

    assert.equal(result.broadcasts, undefined);
    assert.equal(stub.urls.length, 0);
  });
});
