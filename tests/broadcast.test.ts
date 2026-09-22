/**
 * The German TV listings parser.
 *
 * Everything here is checked against markup saved from the live sources, not
 * against a shape invented for the test — see the header comments in
 * `fixtures/`. That matters more here than anywhere else in the app: this is
 * the only part reading HTML nobody promised to keep stable, and its failure
 * mode is a badge that says "not on" about a game that is.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { berlinDate, fetchDay, fetchRanWeek, teamsInTitle } from "../server/src/broadcast.js";
import { fixture, stubFetch } from "./helpers.js";

const SUNDAY = fixture("tvspielfilm-rtl-sunday.html");
const PAST_HORIZON = fixture("tvspielfilm-past-horizon.html");
const RAN = fixture("ran-joyn-week2.html");

let stub: { restore: () => void; urls: string[] } | null = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

function serve(body: string, status = 200) {
  stub = stubFetch([{ match: "http", body, status }]);
  return stub;
}

describe("teamsInTitle", () => {
  it("reads both separators the listings use, and ignores the order", () => {
    // German listings write home-first with a dash and away-first with "at",
    // both in the same week. The pair is what identifies the game.
    assert.deepEqual(teamsInTitle("American Football: NFL Week 3: Buffalo Bills – Detroit Lions").sort(), [
      "BUF",
      "DET",
    ]);
    assert.deepEqual(teamsInTitle("New York Giants at Los Angeles Rams").sort(), ["LAR", "NYG"]);
  });

  it("falls back to nicknames when a city is misspelt", () => {
    // "Los Ageles" is the live ran.joyn page's own typo, not a contrivance.
    assert.deepEqual(teamsInTitle("New York Giants at Los Ageles Rams").sort(), ["LAR", "NYG"]);
  });

  it("does not match a nickname inside a longer word", () => {
    assert.deepEqual(teamsInTitle("Jetsetter im Ramsch-Paradies"), []);
  });

  it("returns nothing for a slot with no matchup named", () => {
    assert.deepEqual(teamsInTitle("American Football: NFL"), []);
  });
});

describe("fetchDay", () => {
  it("asks for the right channel and date", async () => {
    const { urls } = serve(SUNDAY);
    await fetchDay("2026-09-27", "RTL", 5000);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /date=2026-09-27/);
    assert.match(urls[0], /channel=RTL/);
  });

  it("finds the football broadcasts and ignores the rest of the day", async () => {
    serve(SUNDAY);
    const day = await fetchDay("2026-09-27", "RTL", 5000);

    assert.equal(day.published, true);
    // Thirteen programmes on the page; three of them are games.
    assert.equal(day.listings.length, 3);
    assert.deepEqual(
      day.listings.map((l) => l.teams.sort()),
      [
        ["JAX", "NE"],
        ["ARI", "SF"],
        ["DEN", "LAR"],
      ],
    );
    assert.ok(day.listings.every((l) => l.outlet === "RTL"));
  });

  it("reads broadcastTime as German wall clock, not as the UTC it claims", async () => {
    serve(SUNDAY);
    const day = await fetchDay("2026-09-27", "RTL", 5000);

    // The field says "2026-09-27T19:00:00+00:00" and means 19:00 in Berlin,
    // which in September is CEST — so 17:00Z.
    assert.equal(day.listings[0].startsAt, "2026-09-27T17:00:00.000Z");
    assert.equal(day.listings[1].startsAt, "2026-09-27T20:25:00.000Z");
  });

  it("keeps a programme that starts after midnight on the day it is printed", async () => {
    serve(SUNDAY);
    const day = await fetchDay("2026-09-27", "RTL", 5000);

    // Sunday's page, Monday's clock: the Sunday-night game. Dropping it because
    // the date has rolled over is how this game reads as unwatchable.
    assert.equal(day.listings[2].startsAt, "2026-09-28T00:00:00.000Z");
    assert.deepEqual(day.listings[2].teams.sort(), ["DEN", "LAR"]);
  });

  describe("the guards", () => {
    it("distrusts a day whose rows belong to other channels", async () => {
      // A date past the ~14-day horizon: 301 to the undated grid, then 200 with
      // 25 other channels' programmes and no RTL row anywhere.
      serve(PAST_HORIZON);
      const day = await fetchDay("2026-11-15", "RTL", 5000);

      assert.equal(day.published, false, "a day with no RTL row cannot say what is on RTL");
      assert.deepEqual(day.listings, []);
    });

    it("distrusts a day of football that parses as no broadcasts at all", async () => {
      // The canary: if the genre prefix ever changes, every game silently reads
      // as "not on" — the one answer worse than "don't know". Simulated by
      // taking the prefix off the real titles.
      serve(SUNDAY.replaceAll("American Football: NFL", "NFL"));
      const day = await fetchDay("2026-09-27", "RTL", 5000);

      assert.deepEqual(day.listings, []);
      assert.equal(day.published, false, "football on the page but nothing parsed is a broken parser, not an empty schedule");
    });

    it("still trusts a day with no football on it", async () => {
      // A Tuesday is genuinely just a Tuesday.
      serve(SUNDAY.replaceAll('"category1":"American Football"', '"category1":"Dokusoap"'));
      const day = await fetchDay("2026-09-27", "RTL", 5000);

      assert.deepEqual(day.listings, []);
      assert.equal(day.published, true);
    });

    it("reports an empty page as unpublished rather than as nothing on", async () => {
      serve("<html><body>nothing here</body></html>");
      const day = await fetchDay("2026-09-27", "RTL", 5000);
      assert.equal(day.published, false);
    });

    it("has nothing to ask a TV grid about a streaming service", async () => {
      const { urls } = serve(SUNDAY);
      const day = await fetchDay("2026-09-27", "RTL+", 5000);

      assert.deepEqual(day, { listings: [], published: false });
      assert.equal(urls.length, 0, "RTL+ is not a linear channel — don't spend a request finding that out");
    });

    it("propagates a failed request rather than reporting an empty day", async () => {
      serve("gateway blew up", 502);
      // The store above turns this into `unknown`; swallowing it here would
      // make it `unavailable` instead, which is the dishonest answer.
      await assert.rejects(() => fetchDay("2026-09-27", "RTL", 5000), /502/);
    });
  });
});

describe("fetchRanWeek", () => {
  it("takes the week from the page and the games from its table", async () => {
    serve(RAN);
    const week = await fetchRanWeek(5000);

    assert.equal(week.week, 2);
    // Eight blocks carry a broadcast tag; the RTL Nitro whiparound names no
    // teams, so seven resolve to a game.
    assert.equal(week.entries.length, 7);
  });

  it("finds the RTL+ exclusive, which is in no TV listing at all", async () => {
    serve(RAN);
    const week = await fetchRanWeek(5000);

    const stream = week.entries.filter((e) => e.outlets.includes("RTL+"));
    assert.equal(stream.length, 1);
    assert.deepEqual(stream[0].teams.sort(), ["CIN", "HOU"]);
  });

  it("does not read 'Free-TV/RTL Nitro' as plain RTL", async () => {
    serve(RAN);
    const week = await fetchRanWeek(5000);

    for (const entry of week.entries) {
      if (entry.outlets.includes("Nitro")) {
        assert.ok(!entry.outlets.includes("RTL"), "Nitro is its own channel");
      }
    }
  });

  it("reads an entry that carries two outlets", async () => {
    serve(RAN);
    const week = await fetchRanWeek(5000);

    const both = week.entries.find((e) => e.teams.includes("IND") && e.teams.includes("KC"));
    assert.ok(both, "Colts at Chiefs is on the page");
    assert.deepEqual(both.outlets.sort(), ["RTL", "Sky"]);
  });

  it("survives the page's own typos", async () => {
    serve(RAN);
    const week = await fetchRanWeek(5000);

    // "20. Septmeber" — the date is never parsed, so this entry is fine.
    const misdated = week.entries.find((e) => e.teams.includes("PHI") && e.teams.includes("TEN"));
    assert.ok(misdated, "a misspelt date must not lose a game");

    // "Los Ageles Rams" — the full name misses, the nickname carries it.
    const misspelt = week.entries.find((e) => e.teams.includes("LAR"));
    assert.ok(misspelt, "a misspelt city must not lose a game");
    assert.deepEqual(misspelt.teams.sort(), ["LAR", "NYG"]);
  });
});

describe("berlinDate", () => {
  it("gives the Berlin calendar date, not the UTC one", () => {
    // 23:30Z in summer is already the next day in Berlin.
    assert.equal(berlinDate(new Date("2026-09-27T23:30:00Z")), "2026-09-28");
    assert.equal(berlinDate(new Date("2026-09-27T17:00:00Z")), "2026-09-27");
    // And in winter, when Berlin is only one hour ahead.
    assert.equal(berlinDate(new Date("2026-12-01T23:30:00Z")), "2026-12-02");
    assert.equal(berlinDate(new Date("2026-12-01T22:30:00Z")), "2026-12-01");
  });
});
