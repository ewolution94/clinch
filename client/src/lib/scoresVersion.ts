import type { Snapshot } from "./types";

/**
 * A key that changes whenever a game in the snapshot moves: a score, the
 * clock, the state, a kickoff.
 *
 * The snapshot stream is the only thing that hears about a game as it happens.
 * The week and team schedules are separate requests, so without this they keep
 * whatever they first loaded: a Week Schedule left open, or reopened from the
 * background on an iPhone, showed the same score for an hour while the
 * standings moved on (2026-10-18). Both views reload when this changes, which
 * on a game day is every poll, about every 25 seconds, and between games is
 * never, because nothing in it moves.
 */
export function scoresVersion(snapshot: Snapshot): string {
  return [...snapshot.games, ...snapshot.postseason]
    .map((g) => `${g.id}:${g.state}:${g.awayScore}-${g.homeScore}:${g.statusDetail}:${g.kickoff}`)
    .join("|");
}
