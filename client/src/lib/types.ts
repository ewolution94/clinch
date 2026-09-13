export type ConferenceId = "AFC" | "NFC";
export type DivisionName = "East" | "North" | "South" | "West";

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
  id: string;
  week: number;
  kickoff: string;
  opponent: string;
  home: boolean;
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

  seed: number;
  divisionRank: number;
  gamesPlayed: number;
  gamesRemaining: number;

  status: PlayoffStatus;
  gamesBack: number;
  gamesAhead: number;

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

export type RoundId = "wildcard" | "divisional" | "championship" | "superbowl";

export interface PostseasonGame {
  id: string;
  round: RoundId;
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
  stale: boolean;
  conferences: ConferenceView[];
  games: ScoreboardGame[];
  postseason: PostseasonGame[];
}

export type ConnectionState = "connecting" | "live" | "offline";

export interface GameTeamDetail {
  abbr: string;
  location: string;
  name: string;
  accent: string;
  homeAway: "home" | "away";
  score: number | null;
  record: string | null;
  linescores: number[];
  stats: { label: string; value: string }[];
  leaders: { category: string; athlete: string; line: string }[];
}

export interface ScoringPlayDetail {
  id: string;
  period: number;
  clock: string;
  teamAbbr: string;
  type: string;
  text: string;
  away: number;
  home: number;
}

export interface GameDetail {
  id: string;
  state: "pre" | "in" | "post";
  statusDetail: string;
  period: number | null;
  clock: string | null;
  kickoff: string;
  venue: { name: string; city: string; state: string } | null;
  attendance: number | null;
  odds: string | null;
  regulationPeriods: number;
  /** Always [away, home]. */
  teams: GameTeamDetail[];
  scoring: ScoringPlayDetail[];
}
