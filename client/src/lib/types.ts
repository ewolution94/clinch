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
  /** Absent for played games and whenever the lookup is switched off. */
  broadcast?: GameBroadcast;
  /** Only for games outside the US — Munich, London, Madrid and the like. */
  abroad?: GameAbroad;
}

/** As ESPN writes them: "Munich" / "Germany", "London" / "England". */
export interface GameAbroad {
  city: string;
  country: string;
}

/* ------------------------------------------------------- german broadcasts */

export type Outlet = "RTL" | "RTL+" | "Nitro" | "Sky";

/**
 * Four states rather than a boolean, because "nobody has announced this yet" and
 * "this is not being shown" are completely different answers to the only
 * question the week view is being asked.
 */
export type BroadcastStatus =
  "confirmed" | "candidate" | "unavailable" | "unknown";

export interface BroadcastSlot {
  outlet: Outlet;
  /** Programme start — 0–20 minutes before kickoff, for the pregame. */
  startsAt: string;
}

export interface GameBroadcast {
  status: BroadcastStatus;
  slots: BroadcastSlot[];
  contenders: number | null;
  pendingOutlet: Outlet | null;
}

export interface WeekBroadcasts {
  published: boolean;
  confirmed: number;
  candidates: number;
  upcoming: number;
  outlets: Outlet[];
  checkedAt: number;
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

export interface CalendarWeek {
  seasonType: number;
  week: number;
  label: string;
  startDate: string;
  endDate: string;
}

export interface WeekView {
  seasonType: number;
  week: number;
  label: string;
  games: ScoreboardGame[];
  byeTeams: string[];
  settled: boolean;
  /** Absent for a settled week — a played game needs no channel. */
  broadcasts?: WeekBroadcasts;
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
  calendar: CalendarWeek[];
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
  seasonType: number;
  week: number;
  venue: { name: string; city: string; state: string; country: string } | null;
  attendance: number | null;
  odds: string | null;
  regulationPeriods: number;
  /** Always [away, home]. */
  teams: GameTeamDetail[];
  scoring: ScoringPlayDetail[];
}
