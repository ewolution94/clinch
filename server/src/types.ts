export type ConferenceId = "AFC" | "NFC";
export type DivisionName = "East" | "North" | "South" | "West";

/** Where a team sits relative to the playoff cut, worst to best. */
export type PlayoffStatus =
  | "eliminated"
  | "longshot"
  | "hunt"
  | "bubble"
  | "in"
  | "clinched"
  | "clinched-division"
  | "clinched-bye";

export type GameResult = "W" | "L" | "T";

export interface GameRef {
  /** ESPN event id. */
  id: string;
  week: number;
  kickoff: string;
  opponent: string;
  home: boolean;
  /** Null until the game has been played. */
  result: GameResult | null;
  teamScore: number | null;
  opponentScore: number | null;
  state: "pre" | "in" | "post";
}

export interface TeamEntry {
  abbr: string;
  location: string;
  name: string;
  accent: string;
  conference: ConferenceId;
  division: DivisionName;

  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  record: string;

  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;

  streak: string;
  streakKind: GameResult | null;

  divisionRecord: string;
  conferenceRecord: string;
  homeRecord: string;
  roadRecord: string;

  /** Conference seed 1–16 as ESPN ranks it, tiebreakers already applied. */
  seed: number;
  divisionRank: number;
  gamesPlayed: number;
  gamesRemaining: number;

  status: PlayoffStatus;
  /** Games behind the current 7th seed; 0 for teams already in. */
  gamesBack: number;
  /** Games ahead of the first team outside the cut; only for teams in. */
  gamesAhead: number;

  /** Most recent results, oldest first, at most 5. */
  form: GameResult[];
  recent: GameRef[];
  nextGame: GameRef | null;
}

export interface DivisionView {
  id: string;
  name: DivisionName;
  teams: TeamEntry[];
}

export interface SeriesMatchup {
  round: "wildcard";
  higher: string;
  lower: string;
  higherSeed: number;
  lowerSeed: number;
}

export interface ConferenceView {
  id: ConferenceId;
  name: string;
  divisions: DivisionView[];
  /** All 16 teams ordered by seed. */
  seeds: TeamEntry[];
  byeTeam: string | null;
  wildCardGames: SeriesMatchup[];
}

export interface ScoreboardGame {
  id: string;
  week: number;
  kickoff: string;
  state: "pre" | "in" | "post";
  statusDetail: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Snapshot {
  generatedAt: number;
  season: { year: number; type: number; label: string };
  week: { number: number; label: string; total: number };
  live: boolean;
  /** True when the last upstream refresh failed and this is the previous payload. */
  stale: boolean;
  conferences: ConferenceView[];
  games: ScoreboardGame[];
}
