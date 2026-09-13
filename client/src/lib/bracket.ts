import type { ConferenceId, ConferenceView, PostseasonGame, RoundId, TeamEntry } from "./types";

export type { RoundId };

export interface BracketMatch {
  id: string;
  round: RoundId;
  /** Game number within its conference, so slots can say "Winner of Game 5". */
  number: number;
  home: TeamEntry | null;
  away: TeamEntry | null;
  /** Where an unfilled slot's team will come from. */
  homeSource: string | null;
  awaySource: string | null;
  winner: TeamEntry | null;
  /** Null while the game is unplayed and unpicked. */
  decidedBy: "played" | "pick" | null;
  score: { home: number; away: number } | null;
  /**
   * The real ESPN event, once one exists. Null all through the regular season —
   * these matchups are projections from seeding, so there is no game to open.
   */
  gameId: string | null;
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
   * because the 1 seed's lowest remaining opponent came from elsewhere.
   */
  reseeded: boolean;
}

export interface Bracket {
  conferences: ConferenceBracket[];
  superBowl: BracketMatch | null;
  champion: TeamEntry | null;
}

export type Picks = Record<string, string>;

function blank(id: string, round: RoundId, number: number, homeSource: string, awaySource: string): BracketMatch {
  return {
    id,
    round,
    number,
    home: null,
    away: null,
    homeSource,
    awaySource,
    winner: null,
    decidedBy: null,
    score: null,
    gameId: null,
  };
}

/** Lower seed number is the better seed, and hosts every round but the last. */
function seedOrder(a: TeamEntry | null, b: TeamEntry | null): [TeamEntry | null, TeamEntry | null] {
  const teams = [a, b].filter((t): t is TeamEntry => t !== null).sort((x, y) => x.seed - y.seed);
  return [teams[0] ?? null, teams[1] ?? null];
}

/**
 * Settles a match from reality first, then from the reader's own pick.
 *
 * There is deliberately no third fallback. Assuming the higher seed advances
 * would fill the tree to the Super Bowl with results nobody has played, and a
 * bracket that looks decided when nothing is decided is worse than an empty one.
 */
function settle(match: BracketMatch, played: PostseasonGame[], picks: Picks): BracketMatch {
  const { home, away } = match;
  if (!home || !away) return match;

  // Match on the teams alone, whatever state the game is in: a scheduled or
  // in-progress playoff game still exists, and is still worth opening.
  const game = played.find(
    (g) =>
      g.round === match.round &&
      ((g.home === home.abbr && g.away === away.abbr) || (g.home === away.abbr && g.away === home.abbr))
  );
  const withGame = game ? { ...match, gameId: game.id } : match;

  if (game && game.state === "post" && game.homeScore !== null && game.awayScore !== null) {
    const homeIsGameHome = game.home === home.abbr;
    const homeScore = homeIsGameHome ? game.homeScore : game.awayScore;
    const awayScore = homeIsGameHome ? game.awayScore : game.homeScore;
    const winner = homeScore === awayScore ? null : homeScore > awayScore ? home : away;
    return {
      ...withGame,
      winner,
      decidedBy: winner ? "played" : null,
      score: { home: homeScore, away: awayScore },
    };
  }

  const pick = picks[match.id];
  const chosen = pick === home.abbr ? home : pick === away.abbr ? away : null;
  return chosen ? { ...withGame, winner: chosen, decidedBy: "pick" } : withGame;
}

function buildConference(
  conference: ConferenceView,
  played: PostseasonGame[],
  picks: Picks
): ConferenceBracket {
  const bySeed = new Map(conference.seeds.map((t) => [t.seed, t]));
  const seed = (n: number) => bySeed.get(n) ?? null;
  const bye = seed(1);
  const id = conference.id;

  // Top to bottom: the bye, then 4v5, 3v6, 2v7. Pairing neighbours then feeds
  // the divisional round the way the NFL's reseed usually resolves it.
  const pairs: [number, number][] = [
    [4, 5],
    [3, 6],
    [2, 7],
  ];
  const wildcard = pairs.map(([high, low], i) => {
    const [home, away] = seedOrder(seed(high), seed(low));
    return settle(
      { ...blank(`${id}-WC${i + 1}`, "wildcard", i + 1, "", ""), home, away },
      played,
      picks
    );
  });

  const survivors = wildcard.map((m) => m.winner);
  const allThrough = survivors.every((t): t is TeamEntry => t !== null);

  // The divisional round can't be drawn from a partial wild card weekend: the 1
  // seed draws the lowest remaining seed, which isn't known until all three are
  // in. The bye team still takes its slot — that's a rule, not a prediction.
  let divisional: BracketMatch[];
  let reseeded = false;

  if (allThrough && bye) {
    const remaining = [bye, ...survivors.filter((t): t is TeamEntry => t !== null)].sort((a, b) => a.seed - b.seed);
    const first = seedOrder(remaining[0], remaining[3]);
    const second = seedOrder(remaining[1], remaining[2]);
    divisional = [
      settle({ ...blank(`${id}-DV1`, "divisional", 4, "", ""), home: first[0], away: first[1] }, played, picks),
      settle({ ...blank(`${id}-DV2`, "divisional", 5, "", ""), home: second[0], away: second[1] }, played, picks),
    ];
    const byeOpponent = divisional[0].home?.abbr === bye.abbr ? divisional[0].away : divisional[0].home;
    reseeded = byeOpponent?.abbr !== wildcard[0].winner?.abbr;
  } else {
    divisional = [
      { ...blank(`${id}-DV1`, "divisional", 4, "", "Lowest remaining seed"), home: bye },
      blank(`${id}-DV2`, "divisional", 5, "Wild card winner", "Wild card winner"),
    ];
  }

  const [cfHome, cfAway] = seedOrder(divisional[0].winner, divisional[1].winner);
  const championship = settle(
    {
      ...blank(`${id}-CF`, "championship", 6, "Winner of Game 4", "Winner of Game 5"),
      home: cfHome,
      away: cfAway,
    },
    played,
    picks
  );

  return {
    conference: id,
    bye,
    wildcard,
    divisional,
    championship,
    champion: championship.winner,
    reseeded,
  };
}

export function buildBracket(
  conferences: ConferenceView[],
  played: PostseasonGame[],
  picks: Picks
): Bracket {
  const built = conferences.map((c) => buildConference(c, played, picks));
  const afc = built.find((b) => b.conference === "AFC")?.champion ?? null;
  const nfc = built.find((b) => b.conference === "NFC")?.champion ?? null;

  const superBowl = settle(
    { ...blank("SB", "superbowl", 7, "AFC champion", "NFC champion"), home: afc, away: nfc },
    played,
    picks
  );

  return { conferences: built, superBowl, champion: superBowl.winner };
}
