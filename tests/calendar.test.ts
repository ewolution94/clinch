/**
 * The calendar export.
 *
 * Both forms are built from one `gameEvent()`, on the server, because only the
 * server's week data knows which channel is showing the game. The file is the
 * one that has to be right: it is the only route onto an iPhone's calendar, and
 * a malformed `.ics` fails by being silently rejected by the Calendar app.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gameEvent, toGoogleCalendarUrl, googleCalendarPage, toIcs } from "../server/src/calendar.js";
import type { GameDetail, ScoreboardGame } from "../server/src/types.js";
import { game } from "./helpers.js";

const ORIGIN = "https://clinch.ewolution.cloud";

function detail(overrides: Partial<GameDetail> = {}): GameDetail {
  const base: GameDetail = {
    id: "401772",
    state: "pre",
    statusDetail: "Sun 7:00 PM",
    period: null,
    clock: null,
    kickoff: "2026-09-27T17:00:00Z",
    seasonType: 2,
    week: 3,
    venue: { name: "Gillette Stadium", city: "Foxborough", state: "MA", country: "USA" },
    attendance: null,
    odds: null,
    regulationPeriods: 4,
    teams: [
      {
        abbr: "JAX",
        location: "Jacksonville",
        name: "Jaguars",
        accent: "#13b5c8",
        homeAway: "away",
        score: null,
        record: "2-0",
        linescores: [],
        stats: [],
        leaders: [],
      },
      {
        abbr: "NE",
        location: "New England",
        name: "Patriots",
        accent: "#8aa4c8",
        homeAway: "home",
        score: null,
        record: "2-0",
        linescores: [],
        stats: [],
        leaders: [],
      },
    ],
    scoring: [],
  };
  return { ...base, ...overrides };
}

const confirmed = (outlet: string, startsAt: string): ScoreboardGame =>
  game({
    home: "NE",
    away: "JAX",
    broadcast: {
      status: "confirmed",
      slots: [{ outlet: outlet as never, startsAt }],
      contenders: null,
      pendingOutlet: null,
    },
  });

const build = (opts: Partial<Parameters<typeof gameEvent>[0]> = {}) =>
  gameEvent({ detail: detail(), game: undefined, lang: "en", origin: ORIGIN, ...opts });

/** Undoes RFC 5545 line folding, so a value can be read back whole. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

const valueOf = (ics: string, field: string): string => {
  const line = unfold(ics)
    .split("\r\n")
    .find((l) => l.startsWith(`${field}:`));
  assert.ok(line, `${field} is in the file`);
  return line.slice(field.length + 1);
};

describe("the event", () => {
  it("names the game the way a football game is written", () => {
    assert.equal(build().title, "🏈 Jacksonville Jaguars @ New England Patriots");
  });

  it("runs from kickoff for as long as a game takes", () => {
    const event = build();
    assert.equal(event.start, Date.parse("2026-09-27T17:00:00Z"));
    assert.equal((event.end - event.start) / 60_000, 195, "3h15m");
  });

  it("spells the kickoff out in German time", () => {
    // The channel listings are in German time, and that is what the reader is
    // comparing against — 17:00Z is 19:00 in Berlin in September.
    assert.match(build().description, /Kickoff 19:00 German time/);
    assert.match(
      build({ lang: "de" }).description,
      /Kickoff 19:00 Uhr deutscher Zeit/,
    );
  });

  it("gets that right on the other side of the clock change", () => {
    // 25 October 2026 is the CEST→CET fallback. An hour's error here would not
    // look wrong, it would look plausible.
    const winter = build({ detail: detail({ kickoff: "2026-12-06T18:00:00Z" }) });
    assert.match(winter.description, /Kickoff 19:00 German time/);
  });

  it("says where to watch when that is known, and where it is played when it isn't", () => {
    const withTv = build({ game: confirmed("RTL", "2026-09-27T16:45:00Z") });
    assert.equal(withTv.location, "RTL");
    assert.match(withTv.description, /Live on RTL from 18:45/);

    const without = build();
    assert.equal(without.location, "Gillette Stadium, Foxborough");
    assert.match(without.description, /Gillette Stadium, Foxborough/);
  });

  it("names the country for a game played abroad", () => {
    const munich = build({
      detail: detail({
        venue: { name: "Allianz Arena", city: "Munich", state: "", country: "Germany" },
      }),
    });
    assert.equal(munich.location, "Allianz Arena, Munich, Germany");
  });

  it("says a channel might pick the game up rather than promising it", () => {
    const maybe = build({
      game: game({
        home: "NE",
        away: "JAX",
        broadcast: { status: "candidate", slots: [], contenders: 3, pendingOutlet: "RTL" },
      }),
    });

    assert.match(maybe.description, /RTL may pick this game — not announced yet/);
    assert.doesNotMatch(maybe.description, /Live on/);
  });

  it("links back to the game in the app", () => {
    const event = build();
    assert.equal(event.link, `${ORIGIN}/?game=401772`);
    assert.match(event.description, /clinch\.ewolution\.cloud\/\?game=401772/);
  });

  it("names the file after the teams", () => {
    assert.equal(build().filename, "clinch-jax-ne.ics");
  });
});

describe("the .ics file", () => {
  it("is a calendar with one event in it", () => {
    const ics = toIcs(build());

    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
    assert.equal(ics.split("BEGIN:VEVENT").length - 1, 1);
    assert.match(ics, /VERSION:2\.0/);
  });

  it("ends every line the way the spec says", () => {
    const ics = toIcs(build());
    assert.equal(ics.includes("\n\n"), false);
    for (const line of ics.split("\r\n").slice(0, -1)) {
      assert.ok(line.length > 0, "no blank lines");
    }
  });

  it("writes times in UTC, so every calendar shows its own", () => {
    const ics = toIcs(build());
    assert.equal(valueOf(ics, "DTSTART"), "20260927T170000Z");
    assert.equal(valueOf(ics, "DTEND"), "20260927T201500Z");
  });

  it("keeps one id per game, so adding it twice updates rather than doubles", () => {
    assert.equal(valueOf(toIcs(build()), "UID"), "game-401772@clinch");
    assert.equal(valueOf(toIcs(build()), "UID"), valueOf(toIcs(build()), "UID"));
  });

  it("escapes the characters that would otherwise end a field", () => {
    const event = build();
    // The venue line carries commas, which are a value separator in iCalendar.
    assert.match(unfold(toIcs(event)), /Gillette Stadium\\, Foxborough/);

    const awkward = toIcs({
      ...event,
      title: "Semi; colon, comma \\ backslash",
      description: "first\nsecond",
    });
    assert.equal(valueOf(awkward, "SUMMARY"), "Semi\\; colon\\, comma \\\\ backslash");
    assert.equal(valueOf(awkward, "DESCRIPTION"), "first\\nsecond");
  });

  it("folds long lines, and they unfold back to what they were", () => {
    const event = build({ game: confirmed("RTL", "2026-09-27T16:45:00Z") });
    const ics = toIcs(event);

    const folded = ics.split("\r\n").filter((l) => l.startsWith(" "));
    assert.ok(folded.length > 0, "the description is long enough to fold");
    for (const line of ics.split("\r\n")) {
      assert.ok(Buffer.byteLength(line) <= 75, `line within 75 octets: ${line}`);
    }
    // And the value survives the round trip.
    assert.match(valueOf(ics, "DESCRIPTION"), /Live on RTL from 18:45/);
  });

  it("counts octets, not characters, when folding", () => {
    // The 🏈 is four octets. Folding by character length would emit a line
    // that is legal by the wrong measure and can split the emoji in half.
    const ics = toIcs({ ...build(), title: `🏈${"a".repeat(80)}` });

    for (const line of ics.split("\r\n")) {
      assert.ok(Buffer.byteLength(line) <= 75, `line within 75 octets: ${line}`);
    }
    assert.match(valueOf(ics, "SUMMARY"), /^🏈a+$/);
  });
});

describe("the Google Calendar link", () => {
  it("fills the event in on Google's own add-event page", () => {
    const url = new URL(toGoogleCalendarUrl(build()));

    assert.equal(url.origin + url.pathname, "https://calendar.google.com/calendar/render");
    assert.equal(url.searchParams.get("action"), "TEMPLATE");
    assert.equal(url.searchParams.get("text"), "🏈 Jacksonville Jaguars @ New England Patriots");
    assert.equal(url.searchParams.get("dates"), "20260927T170000Z/20260927T201500Z");
    assert.match(url.searchParams.get("details") ?? "", /Kickoff 19:00 German time/);
  });

  it("forwards by script, which is what keeps iOS in the browser", () => {
    // A link the user taps to calendar.google.com is handed to the installed
    // app, which ignores the prefilled event. A scripted navigation is not a
    // universal link, so this page is the last step taken in the browser.
    const page = googleCalendarPage(build(), "en");

    assert.match(page, /location\.replace/);
    assert.match(page, /<html lang="en">/);
  });

  it("shows the link as well, for when the script doesn't run", () => {
    const page = googleCalendarPage(build(), "de");

    assert.match(page, /Weiter zu Google Kalender/);
    assert.match(page, /<a id="go" href="https:\/\/calendar\.google\.com/);
  });

  it("escapes the event into the page rather than writing it raw", () => {
    const page = googleCalendarPage({ ...build(), title: '<script>alert("x")</script>' }, "en");

    assert.doesNotMatch(page, /<script>alert/);
  });
});
