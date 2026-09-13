# Plan — game detail modal

Written 2026-09-14 for a future session. Not implemented. Delete once it is.

**Goal:** every game card on the standings page becomes clickable — scheduled,
live or final — and opens a modal with logos, big scoreboard type, a
quarter-by-quarter linescore and team statistics.

Entry point today is `WeekGames` (`client/src/components/WeekGames.tsx`). The
same modal should be reusable later from `BracketMatchCard` and from the "last
5 / next" chips inside `TeamRow`'s drawer, which already carry ESPN event ids —
so build it keyed by **event id alone**, not by anything `WeekGames` has to hand.

---

## 1. What ESPN actually gives us

Verified against live 2026 week 1 data on 2026-09-14. One endpoint:

```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=<id>
```

`ScoreboardGame.id` (already in the snapshot) is that `<id>`. No key needed.

It behaves as three different payloads depending on state:

| State | Size | Linescores | Team stats | Scoring plays | Extra |
| ----- | ---- | ---------- | ---------- | ------------- | ----- |
| **Final** | ~590 kB | full | 25 per team | full | attendance, officials, win probability, drives |
| **Live** | ~515 kB | partial | 25 per team | partial | current drive |
| **Scheduled** | ~110 kB | *none* | *none* | *none* | `lastFiveGames`, `odds`/`pickcenter`, `predictor`, `injuries`, `ticketsInfo` |

**The scheduled payload has no boxscore at all.** The modal therefore needs a
genuinely different body before kickoff — not the same layout with blanks in it.
Design it as two bodies sharing one header.

### Field paths worth knowing

- **Scores + linescores** — `header.competitions[0].competitors[]`:
  `homeAway`, `score`, `linescores[].displayValue`, `team.abbreviation`.
- **Records** — same competitor, `record[]`, each with a `type`
  (`total` / `home` / `road`). **Key off `type`, never the array index** —
  scheduled games return three entries, finals return two.
- **Status** — `header.competitions[0].status`: `period` (number) and
  `displayClock` exist *only while live*; `type.state` is `pre` / `in` / `post`.
- **Team stats** — `boxscore.teams[].statistics[]`, 25 entries, each
  `{name, label, displayValue}`. Useful ones: `firstDowns`, `thirdDownEff`,
  `totalYards`, `yardsPerPlay`, `netPassingYards`, `rushingYards`, `turnovers`,
  `totalPenaltiesYards`, `possessionTime`, `redZoneAttempts`, `sacksYardsLost`.
  Note `interceptions` appears **twice** with different meanings (thrown, and
  defensive) — pick by position or drop it.
- **Leaders** — `leaders[].leaders[]` by category (`passingYards`,
  `rushingYards`, `receivingYards`, `sacks`, `totalTackles`), each with
  `athlete.shortName` and a formatted `displayValue` like `"25/35, 254 YDS, 1 TD"`.
  Present for scheduled games too, as *season* leaders.
- **Scoring plays** — `scoringPlays[]`: `period.number`, `clock.displayValue`,
  `team.id`, `type.text`, `text`, and the running `awayScore` / `homeScore`.
- **Venue** — `gameInfo.venue.fullName` + `.address`, `gameInfo.attendance`.
- **Odds** — `pickcenter[0].details` (e.g. `"KC -2.5"`), `overUnder`.
- **Format** — `format.regulation.periods` is `4`. Use it rather than hardcoding
  where overtime begins.

### Gotchas found while researching

1. **Overtime adds linescore entries.** Verified on NO @ DET (Final/OT): five
   entries, `['0','0','14','10','6']`. The linescore table must render `n`
   columns, labelling anything past `format.regulation.periods` as OT — not
   assume four.
2. **An unplayed quarter reads as `'0'`, not as absent.** A live game in the 4th
   returns `'0'` for quarters that haven't happened. Use `status.period` to
   decide which columns are real; anything beyond it renders as `—`. Without
   this, a game in the 1st quarter looks like three scoreless quarters.
3. **Payload size.** 590 kB per game is far too much to hand to the browser, and
   the app's whole design is that the server normalises ESPN into something
   small. Trim server-side to a compact DTO — target well under 10 kB.
4. **Scheduled `broadcasts` came back empty** even where the scoreboard had one.
   Treat every optional block as absent-by-default; don't build layout that
   assumes it.

---

## 2. Server

### New endpoint

`GET /api/game/:id` → trimmed `GameDetail` JSON. 404 for an unknown id,
503 while the upstream is unreachable and nothing is cached.

Add `server/src/gameDetail.ts` (fetch + normalise, mirroring how `espn.ts`
already narrows the scoreboard) and a `GameDetailStore` for caching. Keep
`espn.ts`'s `getJson` helper, `USER_AGENT` and timeout handling — don't open a
second way of talking to ESPN.

### Suggested DTO

```ts
interface GameDetail {
  id: string;
  state: "pre" | "in" | "post";
  statusDetail: string;        // "Final/OT", "12:12 - 4th"
  period: number | null;       // live only — drives which quarters are real
  clock: string | null;
  kickoff: string;
  venue: { name: string; city: string; state: string } | null;
  attendance: number | null;
  odds: string | null;         // "KC -2.5"
  regulationPeriods: number;   // from format.regulation.periods
  teams: {
    abbr: string;              // resolve through teamMeta() for accent + names
    homeAway: "home" | "away";
    score: number | null;
    record: string | null;     // the `total` entry
    linescores: number[];
    stats: { name: string; label: string; value: string }[];
    leaders: { category: string; athlete: string; line: string }[];
  }[];
  scoring: {
    period: number; clock: string; teamAbbr: string;
    type: string; text: string; away: number; home: number;
  }[];
}
```

Resolve team identity through the existing `teamMeta()` so the client gets
accents and names the same way it does everywhere else, and so an unrecognised
team is filtered out rather than rendered half-broken.

### Caching

Reuse the `CachedWeek` pattern from `snapshotStore.ts`:

| State | TTL |
| ----- | --- |
| `post` | forever — a final game never changes |
| `in` | ~20 s |
| `pre` | ~10 min |

Bound the map (keep ~40 most recent ids, evict oldest). This runs on a NAS;
an unbounded cache keyed by a URL parameter is a slow memory leak.

---

## 3. Client

### Data

`useGameDetail(id: string | null)` in `client/src/hooks/`. Fetches when id is
non-null, exposes `{ detail, loading, error }`, and while `detail.state === "in"`
re-polls on an interval. The existing SSE stream keeps the *card* score live;
the modal owning its own poll is simpler than widening the snapshot, and it
stops as soon as the modal closes.

### Component

`client/src/components/GameModal.tsx`, **lazy-loaded** (`React.lazy` +
`Suspense`) so the main bundle — currently ~82 kB gzipped — doesn't grow for
people who never open one.

Use the native `<dialog>` element with `showModal()`. It gives focus trapping,
Esc-to-close, backdrop inerting and correct semantics for free; re-implementing
those by hand is the usual way this component goes wrong.

Push `?game=<id>` via the existing tiny router in `useRoute.ts` so the modal is
linkable and the Android back gesture closes it rather than leaving the page.

### The transition

Use the **View Transitions API** for a shared-element morph — the clicked card
grows into the dialog:

```ts
if (document.startViewTransition) document.startViewTransition(() => openModal(id));
else openModal(id);
```

Give the card and the modal header matching `view-transition-name` values
(`game-<id>`), and name each team logo too so the marks travel rather than
cross-fade. Browsers without it just get the instant open, which is why the
capability check above is the whole fallback.

Layer a CSS fallback animation on `dialog[open]` (scale 0.96 → 1, backdrop blur
in over ~180 ms) so the no-View-Transitions path still feels deliberate.
Everything must sit behind `prefers-reduced-motion`, which `index.css` already
neutralises globally — check the modal actually inherits that.

### Layout

**Header (all states).** Full-bleed band split down the middle, each half
washed in that team's accent — reuse the `SeedRow` gradient treatment and
`TeamWatermark` for the oversized marks. Big logos, huge tabular score numerals
(48–72 px), records underneath, status pill in the middle (LIVE dot / FINAL /
kickoff in local time).

**Body — final or live:**
1. **Linescore table.** Columns `1 2 3 4 (OT…)` + `T`. Two rows. Winner's total
   emphasised; quarters beyond `period` render `—`. This is the centrepiece —
   it's what was actually asked for.
2. **Team stats.** Paired comparison bars: label in the middle, each team's
   value extending outward in its own accent, width proportional to the pair.
   Pick ~8 stats; the full 25 is noise. Percentage-style stats
   (`thirdDownEff` = `"5-10"`) need parsing before they can drive a bar —
   either parse to a ratio or render those as plain text.
3. **Scoring timeline.** Chronological, grouped by quarter, each entry showing
   team mark, clock, play text and the running score.
4. **Leaders.** Three rows per team (pass / rush / rec) using ESPN's
   pre-formatted `displayValue`.

**Body — scheduled:** records and division standing, last-five form (reuse
`FormDots`), the spread from `pickcenter`, venue, kickoff in local time, and
season leaders. No empty boxscore chrome.

**Mobile.** This is the primary target. Full-screen sheet rather than a centred
dialog below ~640 px, entering from the bottom, with the linescore table
horizontally scrollable — and if it scrolls, reuse `useOverflowEdges` so the
fade behaves correctly (that hook exists precisely because a static fade lied).

---

## 4. Suggested order

1. Server endpoint + DTO + cache; verify by hand against one final, one live and
   one scheduled id. **Checkpoint:** all three return sane JSON under ~10 kB.
2. Hook + a deliberately plain modal (no styling) wired to the cards. Confirms
   routing, lazy-loading, Esc/back, and live polling before any visual work.
3. Header band and linescore table — the core of the request.
4. Stats bars, scoring timeline, leaders.
5. The scheduled-game body.
6. View Transitions morph and the CSS fallback, last: it's the part most likely
   to absorb time, and it must not be load-bearing for the feature working.

Test data is easiest with a pinned finished season, which also gives overtime
and postseason games to check against:

```bash
CLINCH_SEASON=2025 npm run build && CLINCH_SEASON=2025 npm start
```

---

## 5. Open questions for Eric

- **How much statistical depth?** The plan above stops at team-level stats and
  leaders. ESPN also exposes full per-player boxscores, drive-by-drive charts
  and win-probability curves. A win-probability sparkline across the game would
  be striking on a final, but it is a real chunk of work — worth asking before
  building rather than assuming.
- **Should the bracket's matches open the same modal?** They carry event ids
  once the postseason is real, so it is nearly free — but only if the modal is
  built keyed by id from the start, which is why this plan insists on that.
