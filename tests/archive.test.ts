/**
 * Finished seasons.
 *
 * Two things are worth pinning here. One is the guard: the year lands in an
 * upstream URL, so only the seasons on the list may be asked for. The other is
 * that a season is *assembled* — 22 responses become one snapshot — and the
 * assembly has to survive one of them going missing, because a season that
 * fails whole because week 9 timed out is worse than one with a gap in it.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { weekUrl } from "../client/src/lib/api.js";
import { fixture, stubFetch } from "./helpers.js";

let stub: { restore: () => void; urls: string[] } | null = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

/** A scoreboard response in the shape `espn.ts` declares it reads. */
function scoreboard({
  season,
  seasonType,
  week,
  games = [],
  calendar = true,
}: {
  season: number;
  seasonType: number;
  week: number;
  games?: { id: string; home: string; away: string; homeScore: number; awayScore: number }[];
  calendar?: boolean;
}): string {
  return JSON.stringify({
    season: { year: season, type: seasonType },
    week: { number: week, teamsOnBye: [{ abbreviation: "BUF" }] },
    events: games.map((g) => ({
      id: g.id,
      date: `${season}-10-0${(week % 9) + 1}T17:00:00Z`,
      week: { number: week },
      status: { type: { state: "post", shortDetail: "Final" } },
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { abbreviation: g.home }, score: String(g.homeScore) },
            { homeAway: "away", team: { abbreviation: g.away }, score: String(g.awayScore) },
          ],
          status: { type: { state: "post", shortDetail: "Final" } },
          venue: { address: { city: "Somewhere", country: "USA" } },
        },
      ],
    })),
    leagues: calendar
      ? [
          {
            calendar: [
              {
                value: "2",
                entries: Array.from({ length: 18 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Week ${i + 1}`,
                  startDate: "",
                  endDate: "",
                })),
              },
              {
                value: "3",
                entries: [
                  { value: "1", label: "Wild Card" },
                  { value: "4", label: "Pro Bowl" },
                  { value: "5", label: "Super Bowl" },
                ],
              },
            ],
          },
        ]
      : [],
  });
}

/** A store with empty caches, so one test's season can't answer another's. */
let instance = 0;
async function freshStore() {
  instance += 1;
  const mod = await import(`../server/src/archiveStore.js?case=${instance}`);
  return mod.archiveStore as {
    offers: (year: number) => boolean;
    snapshot: (year: number) => Promise<import("../server/src/types.js").Snapshot>;
    week: (year: number, seasonType: number, week: number) => Promise<import("../server/src/types.js").WeekView>;
  };
}

/** Standings for any year, plus a scoreboard for every week asked for. */
function serveSeason(options: { missWeek?: number; noPostseason?: boolean } = {}) {
  const routes = [
    { match: "/standings", body: fixture("standings-2025.json") },
    {
      match: "/scoreboard",
      body: "",
    },
  ];
  const original = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    if (url.includes("/standings")) return new Response(routes[0].body, { status: 200 });

    const params = new URL(url).searchParams;
    const seasonType = Number(params.get("seasontype") ?? 2);
    const week = Number(params.get("week") ?? 1);
    const season = Number(params.get("dates") ?? 2023);

    if (options.missWeek === week && seasonType === 2) {
      return new Response("upstream is down", { status: 503 });
    }
    if (seasonType === 3 && options.noPostseason) {
      return new Response(scoreboard({ season, seasonType, week }), { status: 200 });
    }

    const games =
      seasonType === 3
        ? [{ id: `p${week}`, home: "KC", away: "SF", homeScore: 25, awayScore: 22 }]
        : [{ id: `w${week}`, home: "BUF", away: "NE", homeScore: 24, awayScore: 17 }];
    return new Response(scoreboard({ season, seasonType, week, games }), { status: 200 });
  }) as typeof fetch;

  stub = {
    restore: () => {
      globalThis.fetch = original;
    },
    urls,
  };
  return stub;
}

describe("which seasons are on offer", () => {
  it("offers the finished ones and nothing else", async () => {
    const store = await freshStore();

    assert.equal(store.offers(2023), true);
    assert.equal(store.offers(2021), true);
    assert.equal(store.offers(2025), true);
    // Not on the list: before the 17-game season, and a year that doesn't exist.
    assert.equal(store.offers(2019), false);
    assert.equal(store.offers(1999), false);
    assert.equal(store.offers(Number.NaN), false);
  });
});

describe("building a finished season", () => {
  it("reads the standings and every week of it", async () => {
    const { urls } = serveSeason();
    const store = await freshStore();
    await store.snapshot(2023);

    assert.ok(urls.some((u) => u.includes("/standings") && u.includes("season=2023")));
    for (const week of [1, 9, 18]) {
      assert.ok(
        urls.some((u) => u.includes(`week=${week}`) && u.includes("seasontype=2")),
        `week ${week} was fetched`,
      );
    }
    // The four postseason rounds — and never the Pro Bowl, which isn't one.
    for (const week of [1, 2, 3, 5]) {
      assert.ok(urls.some((u) => u.includes(`week=${week}`) && u.includes("seasontype=3")));
    }
    assert.ok(!urls.some((u) => u.includes("week=4") && u.includes("seasontype=3")));
  });

  it("comes back marked as an archive, at the end of its season", async () => {
    serveSeason();
    const store = await freshStore();
    const snapshot = await store.snapshot(2023);

    assert.equal(snapshot.archived, true);
    assert.equal(snapshot.season.year, 2023);
    assert.equal(snapshot.season.label, "Final");
    assert.equal(snapshot.week.number, 18);
    assert.equal(snapshot.live, false);
    assert.equal(snapshot.stale, false);
  });

  it("carries the season's own calendar, so its weeks can be browsed", async () => {
    serveSeason();
    const store = await freshStore();
    const snapshot = await store.snapshot(2023);

    assert.equal(snapshot.calendar.length, 20, "18 regular weeks and the rounds, less the Pro Bowl");
    assert.equal(snapshot.calendar.at(-1)?.label, "Super Bowl");
  });

  it("labels each postseason round from the week it came from", async () => {
    serveSeason();
    const store = await freshStore();
    const snapshot = await store.snapshot(2023);

    assert.deepEqual(
      snapshot.postseason.map((g) => g.round),
      ["wildcard", "divisional", "championship", "superbowl"],
    );
  });

  it("survives a week that couldn't be fetched", async () => {
    // A gap costs some form history. Failing the whole season would cost the
    // season, and it is never coming back any other way — it is finished.
    serveSeason({ missWeek: 9 });
    const store = await freshStore();
    const snapshot = await store.snapshot(2023);

    assert.equal(snapshot.archived, true);
    assert.equal(snapshot.conferences.length, 2);
    assert.ok(snapshot.conferences[0].seeds.length > 0);
  });

  it("builds a season once, however many readers ask for it", async () => {
    const { urls } = serveSeason();
    const store = await freshStore();

    // Two readers arriving together on a cold container.
    await Promise.all([store.snapshot(2023), store.snapshot(2023)]);
    const first = urls.length;
    await store.snapshot(2023);

    assert.ok(first <= 23, `one season's worth of requests, got ${first}`);
    assert.equal(urls.length, first, "and nothing more on the third ask");
  });

  it("does not keep a season that failed to build", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response("no", { status: 503 })) as typeof fetch;
    const store = await freshStore();

    await assert.rejects(() => store.snapshot(2023));
    // A bad afternoon upstream must not make that year permanently broken.
    globalThis.fetch = original;
    serveSeason();
    const snapshot = await store.snapshot(2023);
    assert.equal(snapshot.archived, true);
  });
});

describe("a week of a finished season", () => {
  it("is settled, and needs no channel", async () => {
    serveSeason();
    const store = await freshStore();
    const view = await store.week(2023, 2, 7);

    assert.equal(view.settled, true, "every game in it is long played");
    assert.equal(view.broadcasts, undefined, "nobody needs to know what was on TV in 2023");
    assert.equal(view.label, "Week 7");
    assert.equal(view.games.length, 1);
  });
});

describe("which week endpoint the page asks", () => {
  it("separates the live season's weeks from an archived season's", () => {
    // A week number means nothing without the year: 2023's week 3 and this
    // week's are different pages from different stores.
    assert.equal(weekUrl(2, 3, null), "/api/week/2/3");
    assert.equal(weekUrl(2, 3, 2023), "/api/season/2023/week/2/3");
    assert.equal(weekUrl(3, 1, 2021), "/api/season/2021/week/3/1");
  });
});
