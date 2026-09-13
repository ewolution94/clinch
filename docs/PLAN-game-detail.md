# Plan — game detail modal

Written 2026-09-14 for a future session. Not implemented. Delete once it is.

**Goal:** every game card on the standings page becomes clickable — scheduled,
live or final — and opens a modal with logos, big scoreboard type, a
quarter-by-quarter linescore and team statistics.

Two confirmed entry points: `WeekGames` (`client/src/components/WeekGames.tsx`)
and **`BracketMatchCard`** — Eric asked for bracket matches to open the same
modal. A third is nearly free later: the "last 5 / next" chips in `TeamRow`'s
drawer already carry ESPN event ids.

So build the modal keyed by **event id alone**, never by anything a particular
card has to hand. See §3.5 for what the bracket needs to supply one.

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
  `team.abbreviation` (directly usable — no id lookup), the running
  `awayScore` / `homeScore`, a categorised `type.text` (`Passing Touchdown`,
  `Rushing Touchdown`, `Field Goal Good`, `Interception Return Touchdown`,
  `Sack Opp Fumble Recovery`…) and a `text` that already names the players:
  `"Mike Gesicki 2 Yd pass from Joe Burrow (Evan McPherson Kick)"`.
  **This block is doing most of the work in this feature — see §3.4.**
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
    // Only the four the UI shows. Drop the other 21 here rather than in the
    // client — it's the difference between a ~4 kB and a ~9 kB response.
    stats: { label: string; value: string }[];
    // Passing / rushing / receiving only, using ESPN's formatted string as-is.
    leaders: { category: string; athlete: string; line: string }[];
  }[];
  scoring: {
    period: number; clock: string; teamAbbr: string;
    type: string;              // "Passing Touchdown", "Field Goal Good"…
    text: string;              // already names the players
    away: number; home: number;
  }[];
}
```

Resolve team identity through the existing `teamMeta()` so the client gets
accents and names the same way it does everywhere else, and so an unrecognised
team is filtered out rather than rendered half-broken.

`scoring` is the largest array and the most valuable — keep every entry. The
savings come from dropping the 21 unused team stats, all per-player boxscores,
`drives`, `winprobability`, `news`, `videos` and `article`, which together are
most of the 590 kB.

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

**Body — final or live.** Eric asked for shallow depth: how the quarters went,
plus a few standout player lines. That points somewhere better than a stats
table, and cheaper to build:

1. **Linescore table.** Columns `1 2 3 4 (OT…)` + `T`. Two rows. Winner's total
   emphasised; quarters beyond `period` render `—`. The centrepiece.
2. **Scoring timeline, grouped by quarter** — the main event, sitting directly
   under the linescore and reading as its expansion. Each quarter is a heading
   with that quarter's score (`CIN 14 — TB 3`), then its plays: clock, team
   mark, the play text, and the running score. Because ESPN's `text` already
   names the players and `type.text` already categorises the score, this
   answers *both* halves of the request at once — "how did each quarter go" and
   "who threw the touchdowns" — with **no parsing and no per-player boxscore
   work at all**. Colour and iconography come off `type.text`: touchdowns in the
   scoring team's accent, field goals muted, defensive scores (interception and
   fumble returns) marked distinctly, since those are the moments worth spotting.
3. **Standouts.** Three compact lines per team — passing, rushing, receiving —
   straight from `leaders[]`'s pre-formatted `displayValue`
   (`"J. Burrow 25/35, 254 YDS, 1 TD, 1 INT"`). Names and numbers, no cards, no
   headshots.
4. **Four team numbers, as text.** Total yards, turnovers, 3rd down, possession.
   Deliberately *not* comparison bars: `thirdDownEff` is `"5-10"` and
   `possessionTime` is `"31:24"`, so bars would mean parsing several formats for
   decoration. Render the pair either side of a centred label and stop there.

Explicitly **out**: the remaining 21 team stats, per-player boxscores, drive
charts and win-probability curves. All are available and all were declined.

**Body — scheduled:** records and division standing, last-five form (reuse
`FormDots`), the spread from `pickcenter`, venue, kickoff in local time, and
season leaders. No empty boxscore chrome.

### 3.5 Opening it from the bracket

`BracketMatchCard` has no event id today — `BracketMatch` is built from seeding,
not from a game. Add `gameId: string | null` to `BracketMatch` in
`client/src/lib/bracket.ts` and set it inside `settle()`, which already locates
the matching `PostseasonGame`; it is a two-line change at the point where the
score is read.

**A bracket card is clickable only when `gameId` is non-null.** Through the whole
regular season the bracket's wild card matchups are projections from current
seeding — no game exists, so there is nothing to open, and offering a click
would imply a fixture that isn't scheduled. This falls straight out of the
"never project" rule; don't work around it by synthesising an id from the two
team abbreviations.

Once the postseason starts, every settled match has a real id and opens the same
modal as a standings card. The `?game=<id>` URL means a bracket game and a
standings game produce the same link.

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
6. Bracket entry point: `gameId` on `BracketMatch`, clickable only when set.
   Cheap once the modal exists, and best verified with `CLINCH_SEASON=2025`,
   where every bracket match has a real game behind it.
7. View Transitions morph and the CSS fallback, last: it's the part most likely
   to absorb time, and it must not be load-bearing for the feature working.

Test data is easiest with a pinned finished season, which also gives overtime
and postseason games to check against:

```bash
CLINCH_SEASON=2025 npm run build && CLINCH_SEASON=2025 npm start
```

---

## 5. Settled with Eric (2026-09-14)

- **Statistical depth: shallow.** Quarters plus a few standout player lines. No
  per-player boxscores, drive charts or win-probability curves — all available,
  all declined. He left the shape open ("surprise me"), and §3's answer is to
  make the **scoring timeline** carry it instead of a stats table: it is less
  work, needs no parsing, and tells the story of each quarter better than
  twenty-five numbers would.
- **Bracket matches open the same modal.** Confirmed. See §3.5 — it needs
  `gameId` threaded onto `BracketMatch`, and cards must stay unclickable while
  the matchup is still only a projection.
- **The View Transitions morph is approved.** Still build it last (§4); it is
  the flourish, not the feature.
