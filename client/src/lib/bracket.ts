import type { ConferenceId, ConferenceView, TeamEntry } from "./types";

export type RoundId = "wildcard" | "divisional" | "championship" | "superbowl";

export interface BracketMatch {
  id: string;
  round: RoundId;
  /** Higher seed, and — outside the Super Bowl — the host. */
  home: TeamEntry | null;
  away: TeamEntry | null;
  winner: TeamEntry | null;
  /** The winner was chosen by the reader rather than defaulted to the seed. */
  picked: boolean;
}

export interface ConferenceBracket {
  conference: ConferenceId;
  bye: TeamEntry | null;
  /** Ordered top to bottom so that adjacent pairs feed the divisional round. */
  wildcard: BracketMatch[];
  divisional: BracketMatch[];
  championship: BracketMatch | null;
  champion: TeamEntry | null;
  /**
   * The divisional pairing no longer matches the lines drawn on the bracket,
   * because an upset changed who the 1 seed's lowest remaining opponent is.
   */
  reseeded: boolean;
}

export interface Bracket {
  conferences: ConferenceBracket[];
  superBowl: BracketMatch | null;
  champion: TeamEntry | null;
}

export type Picks = Record<string, string>;

/**
 * Resolves a match. With no pick, the higher seed advances — "chalk" — which is
 * what makes the default bracket a complete picture rather than a row of empty
 * slots. A pick only counts if it names one of the two teams actually in the
 * match, so picks left over from a path the reader has since changed are
 * ignored instead of having to be cleaned up.
 */
function resolve(match: BracketMatch, picks: Picks, defaultWinner: TeamEntry | null): BracketMatch {
  const { home, away } = match;
  if (!home || !away) return { ...match, winner: home ?? away ?? null, picked: false };

  const pick = picks[match.id];
  const chosen = pick === home.abbr ? home : pick === away.abbr ? away : null;
  return { ...match, winner: chosen ?? defaultWinner, picked: chosen !== null };
}

function match(id: string, round: RoundId, a: TeamEntry | null, b: TeamEntry | null): BracketMatch {
  // Lower seed number is the better seed, and hosts.
  const ordered = [a, b].filter((t): t is TeamEntry => t !== null).sort((x, y) => x.seed - y.seed);
  return { id, round, home: ordered[0] ?? null, away: ordered[1] ?? null, winner: null, picked: false };
}

function buildConference(conference: ConferenceView, picks: Picks): ConferenceBracket {
  const bySeed = new Map(conference.seeds.map((t) => [t.seed, t]));
  const seed = (n: number) => bySeed.get(n) ?? null;
  const bye = seed(1);

  // Top to bottom: the bye, then 4v5, 3v6, 2v7. Pairing neighbours then gives
  // 1v4 and 2v3 — exactly the chalk divisional round — so the drawn lines are
  // correct until an upset forces a reseed.
  const wildcard = [
    match(`${conference.id}-WC1`, "wildcard", seed(4), seed(5)),
    match(`${conference.id}-WC2`, "wildcard", seed(3), seed(6)),
    match(`${conference.id}-WC3`, "wildcard", seed(2), seed(7)),
  ].map((m) => resolve(m, picks, m.home));

  const survivors = [bye, ...wildcard.map((m) => m.winner)]
    .filter((t): t is TeamEntry => t !== null)
    .sort((a, b) => a.seed - b.seed);

  // The NFL reseeds: the 1 seed always draws the lowest remaining seed.
  const divisional =
    survivors.length === 4
      ? [
          match(`${conference.id}-DV1`, "divisional", survivors[0], survivors[3]),
          match(`${conference.id}-DV2`, "divisional", survivors[1], survivors[2]),
        ].map((m) => resolve(m, picks, m.home))
      : [];

  const championship =
    divisional.length === 2
      ? (() => {
          const cf = match(`${conference.id}-CF`, "championship", divisional[0].winner, divisional[1].winner);
          return resolve(cf, picks, cf.home);
        })()
      : null;

  // Chalk keeps the bye paired with the top wild card match's winner.
  const reseeded =
    divisional.length === 2 &&
    divisional[0].away?.abbr !== wildcard[0].winner?.abbr &&
    divisional[0].home?.abbr !== wildcard[0].winner?.abbr;

  return {
    conference: conference.id,
    bye,
    wildcard,
    divisional,
    championship,
    champion: championship?.winner ?? null,
    reseeded,
  };
}

export function buildBracket(conferences: ConferenceView[], picks: Picks): Bracket {
  const built = conferences.map((c) => buildConference(c, picks));
  const afc = built.find((b) => b.conference === "AFC")?.champion ?? null;
  const nfc = built.find((b) => b.conference === "NFC")?.champion ?? null;

  // Neutral site, and no seed to separate two conference champions — so unlike
  // every other round this one has no default winner. It stays a question until
  // the reader answers it.
  const superBowl: BracketMatch | null =
    afc && nfc
      ? resolve({ id: "SB", round: "superbowl", home: afc, away: nfc, winner: null, picked: false }, picks, null)
      : null;

  return { conferences: built, superBowl, champion: superBowl?.winner ?? null };
}

export const ROUND_LABEL: Record<RoundId, string> = {
  wildcard: "Wild card",
  divisional: "Divisional",
  championship: "Conference championship",
  superbowl: "Super Bowl",
};
