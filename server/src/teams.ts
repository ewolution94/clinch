/**
 * Static team metadata. ESPN gives us records and seeds; it does not give us
 * colours that survive a near-black background — several primaries are
 * literally #000000. So accents are hand-picked per team: on-brand, but
 * always legible on the abyss ground the UI is built on.
 */
export interface TeamMeta {
  /** ESPN abbreviation — also the logo filename and our stable key. */
  abbr: string;
  location: string;
  name: string;
  conference: "AFC" | "NFC";
  division: "East" | "North" | "South" | "West";
  /** Legible-on-dark brand accent. */
  accent: string;
}

export const TEAMS: TeamMeta[] = [
  // AFC East
  { abbr: "BUF", location: "Buffalo", name: "Bills", conference: "AFC", division: "East", accent: "#3c85ff" },
  { abbr: "MIA", location: "Miami", name: "Dolphins", conference: "AFC", division: "East", accent: "#00d2c8" },
  { abbr: "NE", location: "New England", name: "Patriots", conference: "AFC", division: "East", accent: "#8aa4c8" },
  { abbr: "NYJ", location: "New York", name: "Jets", conference: "AFC", division: "East", accent: "#17b978" },
  // AFC North
  { abbr: "BAL", location: "Baltimore", name: "Ravens", conference: "AFC", division: "North", accent: "#7d5cff" },
  { abbr: "CIN", location: "Cincinnati", name: "Bengals", conference: "AFC", division: "North", accent: "#fb4f14" },
  { abbr: "CLE", location: "Cleveland", name: "Browns", conference: "AFC", division: "North", accent: "#ff6a2b" },
  { abbr: "PIT", location: "Pittsburgh", name: "Steelers", conference: "AFC", division: "North", accent: "#ffb612" },
  // AFC South
  { abbr: "HOU", location: "Houston", name: "Texans", conference: "AFC", division: "South", accent: "#f2314a" },
  { abbr: "IND", location: "Indianapolis", name: "Colts", conference: "AFC", division: "South", accent: "#4a93e0" },
  { abbr: "JAX", location: "Jacksonville", name: "Jaguars", conference: "AFC", division: "South", accent: "#13b5c8" },
  { abbr: "TEN", location: "Tennessee", name: "Titans", conference: "AFC", division: "South", accent: "#6fb3e8" },
  // AFC West
  { abbr: "DEN", location: "Denver", name: "Broncos", conference: "AFC", division: "West", accent: "#fc5a22" },
  { abbr: "KC", location: "Kansas City", name: "Chiefs", conference: "AFC", division: "West", accent: "#f0283c" },
  { abbr: "LV", location: "Las Vegas", name: "Raiders", conference: "AFC", division: "West", accent: "#c3cad2" },
  { abbr: "LAC", location: "Los Angeles", name: "Chargers", conference: "AFC", division: "West", accent: "#2aa8f0" },
  // NFC East
  { abbr: "DAL", location: "Dallas", name: "Cowboys", conference: "NFC", division: "East", accent: "#7a9ad4" },
  { abbr: "NYG", location: "New York", name: "Giants", conference: "NFC", division: "East", accent: "#3a86e8" },
  { abbr: "PHI", location: "Philadelphia", name: "Eagles", conference: "NFC", division: "East", accent: "#19a89c" },
  { abbr: "WSH", location: "Washington", name: "Commanders", conference: "NFC", division: "East", accent: "#c4415a" },
  // NFC North
  { abbr: "CHI", location: "Chicago", name: "Bears", conference: "NFC", division: "North", accent: "#ff6b1a" },
  { abbr: "DET", location: "Detroit", name: "Lions", conference: "NFC", division: "North", accent: "#1e9fe0" },
  { abbr: "GB", location: "Green Bay", name: "Packers", conference: "NFC", division: "North", accent: "#3fb972" },
  { abbr: "MIN", location: "Minnesota", name: "Vikings", conference: "NFC", division: "North", accent: "#a476ff" },
  // NFC South
  { abbr: "ATL", location: "Atlanta", name: "Falcons", conference: "NFC", division: "South", accent: "#e8203c" },
  { abbr: "CAR", location: "Carolina", name: "Panthers", conference: "NFC", division: "South", accent: "#0aa0e6" },
  { abbr: "NO", location: "New Orleans", name: "Saints", conference: "NFC", division: "South", accent: "#d8c08f" },
  { abbr: "TB", location: "Tampa Bay", name: "Buccaneers", conference: "NFC", division: "South", accent: "#e0303f" },
  // NFC West
  { abbr: "ARI", location: "Arizona", name: "Cardinals", conference: "NFC", division: "West", accent: "#e02b50" },
  { abbr: "LAR", location: "Los Angeles", name: "Rams", conference: "NFC", division: "West", accent: "#5b8cff" },
  { abbr: "SF", location: "San Francisco", name: "49ers", conference: "NFC", division: "West", accent: "#d4453f" },
  { abbr: "SEA", location: "Seattle", name: "Seahawks", conference: "NFC", division: "West", accent: "#69be28" },
];

const BY_ABBR = new Map(TEAMS.map((t) => [t.abbr, t]));

/** ESPN is not perfectly consistent across endpoints; normalise the strays. */
const ALIASES: Record<string, string> = { WAS: "WSH", LA: "LAR", JAC: "JAX", SD: "LAC", OAK: "LV", STL: "LAR" };

export function teamMeta(abbr: string): TeamMeta | undefined {
  return BY_ABBR.get(abbr) ?? BY_ABBR.get(ALIASES[abbr] ?? "");
}
