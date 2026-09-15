/**
 * German broadcast listings.
 *
 * ESPN's scoreboard carries US networks only — every `geoBroadcasts` entry comes
 * back `region: "us"` — so "can I watch this from Germany?" needs a second
 * source entirely. Two are used, and they are deliberately different in kind:
 *
 * - **TV Spielfilm** for linear channels. Its programme grid names the exact
 *   matchup and runs about a fortnight ahead, which is the only reason a "next
 *   week" answer is possible at all.
 * - **ran.joyn.de** for the single game RTL+ streams that never appears in a TV
 *   listing, because RTL+ is not a linear channel. That page only ever describes
 *   the current week, so it is applied to that week and to no other.
 *
 * Neither is an API and neither is promised to us. Everything here is written to
 * fail quietly: the store above turns any error into a missing badge, never a
 * missing page.
 */
import { TEAMS } from "./teams.js";

export type Outlet = "RTL" | "RTL+" | "Nitro" | "Sky";

/** TV Spielfilm's channel ids for the outlets that carry the NFL. */
const LINEAR_CHANNEL: Partial<Record<Outlet, string>> = {
  RTL: "RTL",
  Nitro: "RTL-N",
  Sky: "SKYSTE",
};

const USER_AGENT = "clinch/1.0 (+https://github.com/ewolution94/clinch)";
const TVS = "https://www.tvspielfilm.de/tv-programm/sendungen/";
const RAN =
  "https://ran.joyn.de/sports/american-football/nfl/nfl202627-live-uebertragung-im-free-tv-livestream-und-ticker-wer-zeigt-die-partien-der-aktuellen-saison-173951";

async function getText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "de-DE,de;q=0.9",
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------- teams */

interface NameEntry {
  abbr: string;
  full: string;
  nick: RegExp;
}

/**
 * Built from the 32 teams we already carry, so there is no second list of names
 * to drift. Full names are matched first because they are unambiguous; the
 * nickname pass exists only to survive a misspelt city, which the editorial
 * source ships regularly ("Los Ageles Rams").
 */
const NAME_INDEX: NameEntry[] = TEAMS.map((t) => ({
  abbr: t.abbr,
  full: `${t.location} ${t.name}`,
  nick: new RegExp(`(^|[^\\w])${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w]|$)`),
}));

/**
 * The abbreviations of every team named in a listing title.
 *
 * Deliberately order-agnostic: German listings write the home team first with a
 * dash ("Bills – Lions") but the away team first with "at" ("Giants at Rams"),
 * and both spellings turn up in the same week. Parsing the separator would mean
 * tracking a format nobody promised to keep, so the pair is treated as a set and
 * home/away is taken from ESPN, which knows.
 */
export function teamsInTitle(title: string): string[] {
  const full = [...new Set(NAME_INDEX.filter((t) => title.includes(t.full)).map((t) => t.abbr))];
  if (full.length >= 2) return full;
  const nick = [...new Set(NAME_INDEX.filter((t) => t.nick.test(title)).map((t) => t.abbr))];
  return nick.length >= full.length ? nick : full;
}

/* -------------------------------------------------------------------- time */

function berlinOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asUtc - at.getTime();
}

/**
 * TV Spielfilm stamps `broadcastTime` with a `+00:00` it does not mean — 19:00 in
 * that field is 19:00 in Germany, not UTC. The offset is dropped and the wall
 * clock re-read in Europe/Berlin, which also settles CET vs CEST. Resolved twice
 * because the offset depends on the instant it is being used to find.
 */
function berlinWallClockToUtc(stamp: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(stamp);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ts = guess;
  for (let i = 0; i < 2; i += 1) ts = guess - berlinOffsetMs(new Date(ts));
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

/** The Berlin calendar date an instant falls on, as `YYYY-MM-DD`. */
export function berlinDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/* ------------------------------------------------------------------ decode */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
};

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X"))
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    return ENTITIES[body] ?? whole;
  });
}

/* -------------------------------------------------------------- tv spielfilm */

export interface Listing {
  outlet: Outlet;
  /** Programme start, which runs 0–20 minutes before kickoff for the pregame. */
  startsAt: string;
  title: string;
  /** Empty when the listing is a slot whose matchup RTL hasn't announced yet. */
  teams: string[];
}

export interface DayListings {
  listings: Listing[];
  /**
   * False when the day carried no programmes at all, which is how TV Spielfilm
   * answers for a date past its horizon. The difference between "nothing is on"
   * and "nobody has published this yet" is the whole honesty of the feature, so
   * it is carried rather than inferred from an empty array.
   */
  published: boolean;
}

/**
 * A live game broadcast is prefixed with the genre; a magazine is not. Verified
 * across a fortnight of listings: "American Football: NFL Thursday Night: …" and
 * "American Football: NFL Week 3" are broadcasts, while "NFL Sideline – Das
 * Highlight Magazin" and "NFL LIVE – Guten Abend Football" are not. That one
 * prefix is what separates a game slot from a studio show, and it is why an
 * unnamed slot can be told apart from a magazine that also names no teams.
 */
const GAME_PREFIX = /^American Football:/;

export async function fetchDay(
  date: string,
  outlet: Outlet,
  timeoutMs: number
): Promise<DayListings> {
  const channel = LINEAR_CHANNEL[outlet];
  if (!channel) return { listings: [], published: false };

  const html = await getText(
    `${TVS}?date=${encodeURIComponent(date)}&tz=ganztags&channel=${encodeURIComponent(channel)}`,
    timeoutMs
  );

  const anchors = html.match(
    /<a\b[^>]*href="https:\/\/www\.tvspielfilm\.de\/tv-programm\/sendung\/[^"]*"[^>]*>/g
  );
  if (!anchors || anchors.length === 0) return { listings: [], published: false };

  const listings: Listing[] = [];
  let onChannel = 0;
  let football = 0;
  for (const tag of anchors) {
    const title = decode(/\btitle="([^"]*)"/.exec(tag)?.[1] ?? "").trim();
    const tracking = /\bdata-tracking-point='([^']*)'/.exec(tag)?.[1];
    if (!title || !tracking) continue;

    let point: { broadcastTime?: string; category1?: string; channel?: string };
    try {
      point = JSON.parse(decode(tracking)) as typeof point;
    } catch {
      continue;
    }
    // Past its horizon TV Spielfilm quietly serves today's all-channel grid
    // instead of an error, so a date nobody has published yet would otherwise
    // read as "nothing on RTL". The only tell is that the rows belong to other
    // channels, so the requested one has to be seen before the day is believed.
    if (point.channel === channel) onChannel += 1;
    if (point.category1 !== "American Football") continue;
    football += 1;
    if (!GAME_PREFIX.test(title)) continue;

    const startsAt = point.broadcastTime ? berlinWallClockToUtc(point.broadcastTime) : null;
    if (!startsAt) continue;

    listings.push({ outlet, startsAt, title, teams: teamsInTitle(title) });
  }

  if (onChannel === 0) return { listings: [], published: false };

  /**
   * The canary. `GAME_PREFIX` is the one assumption in this file whose failure
   * is *wrong* rather than merely absent: drop a broadcast because its title
   * stopped carrying the genre prefix and the game is reported as not on, which
   * is the only answer here worse than "don't know".
   *
   * So when a day has football programmes but none of them look like a
   * broadcast, that is treated as a parse we can't vouch for rather than as an
   * empty schedule. A day with no football at all is genuinely just a Tuesday,
   * and stays trustworthy.
   */
  const parseSuspect = football > 0 && listings.length === 0;
  return { listings, published: !parseSuspect };
}

/* --------------------------------------------------------------------- ran */

export interface RanEntry {
  outlets: Outlet[];
  teams: string[];
}

export interface RanWeek {
  /** The week the page describes. Its table is only ever the current one. */
  week: number | null;
  entries: RanEntry[];
}

const RAN_TAGS: [RegExp, Outlet][] = [
  [/Pay-Livestream\s*\/\s*RTL\+/i, "RTL+"],
  [/Free-TV\s*\/\s*RTL\s*Nitro/i, "Nitro"],
  [/Pay-TV\s*\/\s*Sky/i, "Sky"],
];

/**
 * ran.joyn.de's weekly table, which is the only public place the RTL+ stream's
 * matchup is named. It is hand-written editorial and reads like it — the live
 * page currently ships "Septmeber" and "Los Ageles Rams" — so the date is never
 * parsed and a single recognised team is enough. Within one week a team plays
 * once, so one name identifies the game; the caller resolves it.
 */
export async function fetchRanWeek(timeoutMs: number): Promise<RanWeek> {
  const html = await getText(RAN, timeoutMs);
  const week = /Woche\s*(\d{1,2})/i.exec(html) ?? /Week\s*(\d{1,2})/i.exec(html);

  const entries: RanEntry[] = [];
  for (const block of html.match(/<(li|p)\b[^>]*>[\s\S]*?<\/\1>/g) ?? []) {
    const text = decode(block.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!/\(\s*(Free-TV|Pay-TV|Pay-Livestream)/i.test(text)) continue;

    const outlets: Outlet[] = [];
    for (const [pattern, outlet] of RAN_TAGS) if (pattern.test(text)) outlets.push(outlet);
    // Plain "Free-TV/RTL" must not also match the Nitro tag above it.
    if (/Free-TV\s*\/\s*RTL(?!\s*Nitro|\+)/i.test(text)) outlets.push("RTL");
    if (outlets.length === 0) continue;

    const teams = teamsInTitle(text);
    if (teams.length === 0) continue;
    entries.push({ outlets, teams });
  }

  return { week: week ? Number(week[1]) : null, entries };
}
