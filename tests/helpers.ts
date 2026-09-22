/**
 * Shared scaffolding for the suite: fixture loading, a fetch stub, and builders
 * for the two shapes almost every test needs (a standings table and a game).
 *
 * The builders take only what a test cares about and fill the rest with
 * something plausible, so a test that is about elimination arithmetic doesn't
 * have to spell out a point differential to say so.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { teamMeta } from "../server/src/teams.js";
import type { RawEntry, StandingsPayload } from "../server/src/espn.js";
import type { ScoreboardGame } from "../server/src/types.js";

const FIXTURES = fileURLToPath(new URL("fixtures/", import.meta.url));

export function fixture(name: string): string {
  return readFileSync(FIXTURES + name, "utf8");
}

export function jsonFixture<T>(name: string): T {
  return JSON.parse(fixture(name)) as T;
}

/* ------------------------------------------------------------------- fetch */

/**
 * Swaps `fetch` for one that answers from a table of saved responses, and hands
 * back the requested URLs so a test can assert on what was asked for.
 *
 * Matching is by substring so a test can key on the part of the URL it means —
 * the channel, the date — without restating query-string order.
 */
export function stubFetch(routes: { match: string; body: string; status?: number }[]): {
  restore: () => void;
  urls: string[];
} {
  const original = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) return new Response("not found", { status: 404 });
    return new Response(route.body, {
      status: route.status ?? 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as typeof fetch;

  return {
    restore: () => {
      globalThis.fetch = original;
    },
    urls,
  };
}

/* --------------------------------------------------------------- standings */

export interface TeamSpec {
  abbr: string;
  wins: number;
  losses: number;
  ties?: number;
  /** ESPN's conference seed. 0 means "hasn't played yet", as ESPN reports it. */
  seed: number;
  pointDiff?: number;
  streak?: string;
}

const DIVISIONS = ["East", "North", "South", "West"] as const;

function entry(spec: TeamSpec): RawEntry {
  const ties = spec.ties ?? 0;
  const played = spec.wins + spec.losses + ties;
  const record = `${spec.wins}-${spec.losses}${ties ? `-${ties}` : ""}`;
  const stat = (name: string, value: number, displayValue?: string) => ({
    name,
    value,
    displayValue: displayValue ?? String(value),
  });

  return {
    team: { abbreviation: spec.abbr, displayName: spec.abbr },
    stats: [
      stat("wins", spec.wins),
      stat("losses", spec.losses),
      stat("ties", ties),
      stat("winPercent", played ? (spec.wins + ties / 2) / played : 0),
      stat("playoffSeed", spec.seed),
      stat("pointsFor", 0),
      stat("pointsAgainst", 0),
      stat("pointDifferential", spec.pointDiff ?? 0),
      { name: "overall", value: null, displayValue: record },
      { name: "streak", value: null, displayValue: spec.streak ?? "W1" },
      { name: "divisionRecord", value: null, displayValue: "0-0" },
      { name: "vs. Conf.", value: null, displayValue: "0-0" },
      { name: "Home", value: null, displayValue: "0-0" },
      { name: "Road", value: null, displayValue: "0-0" },
    ],
  };
}

/**
 * A standings payload from a flat list of teams. Division membership comes from
 * `teams.ts` — the real one — so a test can't accidentally invent a league.
 */
export function standings(teams: TeamSpec[]): StandingsPayload {
  const groups = new Map<string, { conference: "AFC" | "NFC"; division: string; entries: RawEntry[] }>();
  for (const spec of teams) {
    const meta = teamMeta(spec.abbr);
    if (!meta) throw new Error(`unknown team in fixture: ${spec.abbr}`);
    const { conference, division } = meta;
    const key = `${conference} ${division}`;
    const group = groups.get(key) ?? { conference, division: key, entries: [] };
    group.entries.push(entry(spec));
    groups.set(key, group);
  }

  // buildConferences insists on all eight divisions being present.
  for (const conference of ["AFC", "NFC"] as const) {
    for (const division of DIVISIONS) {
      const key = `${conference} ${division}`;
      if (!groups.has(key)) groups.set(key, { conference, division: key, entries: [] });
    }
  }

  return { season: 2026, seasonType: 2, divisions: [...groups.values()] };
}

/* ------------------------------------------------------------------- games */

let gameCounter = 0;

export function game(spec: Partial<ScoreboardGame> & Pick<ScoreboardGame, "home" | "away">): ScoreboardGame {
  gameCounter += 1;
  return {
    id: spec.id ?? `g${gameCounter}`,
    week: spec.week ?? 1,
    kickoff: spec.kickoff ?? "2026-09-27T17:00:00Z",
    state: spec.state ?? "pre",
    statusDetail: spec.statusDetail ?? "",
    home: spec.home,
    away: spec.away,
    homeScore: spec.homeScore ?? null,
    awayScore: spec.awayScore ?? null,
    ...(spec.abroad ? { abroad: spec.abroad } : {}),
    ...(spec.broadcast ? { broadcast: spec.broadcast } : {}),
  };
}

/** An ISO stamp `days` from now, at a given Berlin-ish hour, for horizon tests. */
export function soon(days: number, hourUtc = 17): string {
  const at = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  at.setUTCHours(hourUtc, 0, 0, 0);
  return at.toISOString();
}
