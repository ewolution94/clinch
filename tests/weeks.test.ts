/**
 * The week browser's labelling, and the error message behind it.
 *
 * A week is a schedule, not a time machine — so the one thing the UI must never
 * do is let a browsed week read as now.
 */
import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { currentWeek, findBySlug, relativeLabel, weekSlug } from "../client/src/lib/weeks.js";
import { describeError } from "../server/src/describeError.js";
import type { CalendarWeek } from "../client/src/lib/types.js";

/** A season as ESPN gives it: 18 regular weeks, then the postseason from 1. */
const CALENDAR: CalendarWeek[] = [
  ...Array.from({ length: 18 }, (_, i) => ({
    seasonType: 2,
    week: i + 1,
    label: `Week ${i + 1}`,
    startDate: `2026-09-${String(2 + i).padStart(2, "0")}T07:00:00Z`,
    endDate: `2026-09-${String(3 + i).padStart(2, "0")}T07:00:00Z`,
  })),
  { seasonType: 3, week: 1, label: "Wild Card", startDate: "2027-01-05T08:00:00Z", endDate: "2027-01-12T08:00:00Z" },
  { seasonType: 3, week: 2, label: "Divisional Round", startDate: "2027-01-12T08:00:00Z", endDate: "2027-01-19T08:00:00Z" },
  { seasonType: 3, week: 3, label: "Conference Championship", startDate: "2027-01-19T08:00:00Z", endDate: "2027-01-26T08:00:00Z" },
  { seasonType: 3, week: 5, label: "Super Bowl", startDate: "2027-02-02T08:00:00Z", endDate: "2027-02-09T08:00:00Z" },
];

const at = (seasonType: number, week: number): CalendarWeek => {
  const found = CALENDAR.find((e) => e.seasonType === seasonType && e.week === week);
  assert.ok(found);
  return found;
};

afterEach(() => mock.timers.reset());

describe("week slugs", () => {
  it("numbers the regular season and names the rest", () => {
    assert.equal(weekSlug(at(2, 5)), "5");
    assert.equal(weekSlug(at(3, 1)), "wild-card");
    assert.equal(weekSlug(at(3, 3)), "conference-championship");
    assert.equal(weekSlug(at(3, 5)), "super-bowl");
  });

  it("finds a week from its slug, and nothing from a slug that names none", () => {
    assert.equal(findBySlug(CALENDAR, "5")?.week, 5);
    assert.equal(findBySlug(CALENDAR, "wild-card")?.seasonType, 3);
    assert.equal(findBySlug(CALENDAR, "week-5"), null);
    assert.equal(findBySlug(CALENDAR, null), null);
  });

  it("does not confuse week 1 with the wild card round", () => {
    // Both are "week 1" as far as the numbers go.
    assert.notEqual(weekSlug(at(2, 1)), weekSlug(at(3, 1)));
    assert.equal(findBySlug(CALENDAR, "1")?.seasonType, 2);
  });
});

describe("which week the league is on", () => {
  it("takes it from the calendar's own dates", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-08T12:00:00Z") });
    assert.equal(currentWeek(CALENDAR, 1, 2)?.week, 7);
  });

  it("falls back to the snapshot's week between two seasons", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2027-07-01T12:00:00Z") });
    const week = currentWeek(CALENDAR, 3, 2);
    assert.equal(week?.week, 3);
    assert.equal(week?.seasonType, 2);
  });

  it("falls back to the first week when even that names nothing", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2027-07-01T12:00:00Z") });
    assert.equal(currentWeek(CALENDAR, 99, 2)?.week, 1);
    assert.equal(currentWeek([], 99, 2), null);
  });
});

describe("how a browsed week is labelled", () => {
  it("says nothing about the week you are already on", () => {
    assert.equal(relativeLabel(CALENDAR, at(2, 5), at(2, 5)), null);
  });

  it("names the neighbours", () => {
    assert.equal(relativeLabel(CALENDAR, at(2, 6), at(2, 5)), "next week");
    assert.equal(relativeLabel(CALENDAR, at(2, 4), at(2, 5)), "last week");
  });

  it("counts the rest", () => {
    assert.equal(relativeLabel(CALENDAR, at(2, 8), at(2, 5)), "3 weeks ahead");
    assert.equal(relativeLabel(CALENDAR, at(2, 2), at(2, 5)), "3 weeks back");
  });

  it("counts calendar positions across the postseason, not week numbers", () => {
    // The postseason restarts at week 1, so arithmetic on the numbers said the
    // Wild Card round was "100 weeks ahead" of week 18.
    assert.equal(relativeLabel(CALENDAR, at(3, 1), at(2, 18)), "next week");
    assert.equal(relativeLabel(CALENDAR, at(3, 1), at(2, 16)), "3 weeks ahead");
    assert.equal(relativeLabel(CALENDAR, at(2, 18), at(3, 2)), "2 weeks back");
  });

  it("counts the Super Bowl as one week on, though it is numbered 5", () => {
    // Week 4 is the Pro Bowl and is not in the calendar at all.
    assert.equal(relativeLabel(CALENDAR, at(3, 5), at(3, 3)), "next week");
  });

  it("says nothing when a week is not in this calendar", () => {
    const stranger: CalendarWeek = { seasonType: 2, week: 42, label: "Week 42", startDate: "", endDate: "" };
    assert.equal(relativeLabel(CALENDAR, stranger, at(2, 5)), null);
    assert.equal(relativeLabel(CALENDAR, at(2, 5), stranger), null);
  });
});

describe("describeError", () => {
  it("names the reason fetch is hiding", () => {
    // What "[clinch] refresh failed: fetch failed" was actually about.
    const cause = Object.assign(new Error("self-signed certificate in certificate chain"), {
      code: "SELF_SIGNED_CERT_IN_CHAIN",
    });
    const error = new TypeError("fetch failed", { cause });

    assert.equal(
      describeError(error),
      "fetch failed: SELF_SIGNED_CERT_IN_CHAIN (self-signed certificate in certificate chain)",
    );
  });

  it("does not say the code twice when the message already carries it", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:4600"), { code: "ECONNREFUSED" });
    assert.equal(describeError(error), "connect ECONNREFUSED 127.0.0.1:4600");
  });

  it("handles what was thrown not being an error at all", () => {
    assert.equal(describeError("just a string"), "just a string");
    assert.equal(describeError(new Error("outer", { cause: "inner" })), "outer: inner");
  });

  it("stops rather than following a cycle forever", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    (a as Error & { cause?: unknown }).cause = b;

    assert.equal(describeError(a).split(": ").length, 5);
  });
});
