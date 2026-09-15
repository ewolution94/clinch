import type { CalendarWeek } from "./types";

/** `Week 5` → `5`; `Wild Card` → `wild-card`. Readable and linkable. */
export function weekSlug(entry: CalendarWeek): string {
  if (entry.seasonType === 2) return String(entry.week);
  return entry.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findBySlug(
  calendar: CalendarWeek[],
  slug: string | null,
): CalendarWeek | null {
  if (!slug) return null;
  return calendar.find((entry) => weekSlug(entry) === slug) ?? null;
}

/**
 * The week the league is on. Uses the calendar's own date ranges, falling back
 * to the snapshot's week number when today sits between two seasons.
 */
export function currentWeek(
  calendar: CalendarWeek[],
  fallbackWeek: number,
  fallbackType: number,
): CalendarWeek | null {
  const now = Date.now();
  const inRange = calendar.find(
    (entry) =>
      entry.startDate &&
      entry.endDate &&
      Date.parse(entry.startDate) <= now &&
      now < Date.parse(entry.endDate),
  );
  if (inRange) return inRange;
  return (
    calendar.find(
      (e) => e.seasonType === fallbackType && e.week === fallbackWeek,
    ) ??
    calendar[0] ??
    null
  );
}

/**
 * "3 weeks ahead" / "last week" — never let a browsed week read as now.
 *
 * Counted by position in the calendar, not by week number: the postseason
 * restarts at week 1, so any arithmetic on the numbers themselves reports
 * nonsense the moment you cross from week 18 into the Wild Card round.
 */
export function relativeLabel(
  calendar: CalendarWeek[],
  target: CalendarWeek,
  current: CalendarWeek,
): string | null {
  const at = (entry: CalendarWeek) =>
    calendar.findIndex(
      (e) => e.seasonType === entry.seasonType && e.week === entry.week,
    );
  const from = at(current);
  const to = at(target);
  if (from < 0 || to < 0) return null;

  const delta = to - from;
  if (delta === 0) return null;
  if (delta === 1) return "next week";
  if (delta === -1) return "last week";
  const n = Math.abs(delta);
  return delta > 0 ? `${n} weeks ahead` : `${n} weeks back`;
}
