import type { PlayoffStatus } from "./types";

export interface StatusMeta {
  /** Full label, for the playoff view. */
  label: string;
  /** Two or three characters, for a dense standings row. */
  short: string;
  color: string;
  /** Teams in these states hold a seed right now. */
  inField: boolean;
}

export const STATUS_META: Record<PlayoffStatus, StatusMeta> = {
  "clinched-bye": {
    label: "Clinched bye",
    short: "BYE",
    color: "var(--color-gold)",
    inField: true,
  },
  "clinched-division": {
    label: "Clinched division",
    short: "DIV",
    color: "var(--color-brand)",
    inField: true,
  },
  clinched: {
    label: "Clinched berth",
    short: "IN",
    color: "var(--color-jade)",
    inField: true,
  },
  in: {
    label: "In the field",
    short: "IN",
    color: "var(--color-jade)",
    inField: true,
  },
  bubble: {
    label: "On the bubble",
    short: "BUB",
    color: "var(--color-ice)",
    inField: false,
  },
  hunt: {
    label: "In the hunt",
    short: "HNT",
    color: "var(--color-mist)",
    inField: false,
  },
  longshot: {
    label: "Long shot",
    short: "LNG",
    color: "var(--color-mist)",
    inField: false,
  },
  eliminated: {
    label: "Eliminated",
    short: "OUT",
    color: "#4e5a70",
    inField: false,
  },
};

/**
 * Seed colour ladder: the bye, then division winners, then wild cards.
 *
 * Which of those a team is comes from its position in its own division, never
 * from the seed number. Seeds 1–4 are usually the four division leaders, but
 * that only holds once every team has played — early in a season a second-place
 * team can hold seed 4, and calling it a division winner would be a lie.
 */
export function seedRole(
  seed: number,
  divisionRank: number,
): { label: string; color: string } {
  if (seed > 7)
    return { label: "Outside the field", color: "var(--color-mist)" };
  if (seed === 1)
    return { label: "Bye + home field", color: "var(--color-gold)" };
  if (divisionRank === 1)
    return { label: "Division leader", color: "var(--color-brand)" };
  return { label: "Wild card", color: "var(--color-jade)" };
}
