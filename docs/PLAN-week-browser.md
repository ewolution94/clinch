# Plan — week browser

Written 2026-09-15 for a future session. Not implemented. Delete once it is.

**Goal:** browse any week of the season — next week, a week back, or week 14 in
March — as a proper view rather than the compact strip that exists now.

---

## 1. Scope decision, up front

"See a week" could mean two very different things, and they are not equally
honest:

- **The schedule and results for that week** — fixtures, kickoff times, byes,
  scores. Fully supported by the data. **This is the feature.**
- **The standings as they stood after that week** — *deliberately out of scope.*
  ESPN only ever exposes the **current** `playoffSeed`. Records could be
  recomputed from results, but seeds could not, and this app's central promise
  is that seeding comes from ESPN with the real tiebreaker chain applied rather
  than from something we invented (see README, "How the labels are derived").
  A historical playoff picture would mean breaking exactly the rule the rest of
  the app is built on.

So: the week browser changes **which games you're looking at**. The standings,
seeds and bracket always describe *now*. The UI must never blur that — see §4's
note on the "current week" marker.

If a historical standings view is ever wanted, it should be a separate,
explicitly-labelled thing ("records as of week N", no seeds), not a side effect
of this.

---

## 2. What ESPN gives (verified 2026-09-15)

### The calendar — this is the backbone

`scoreboard` already returns `leagues[0].calendar`: four sections
(`Preseason`, `Regular Season`, `Postseason`, `Off Season`) keyed by
`value` = season type. Each has `entries[]` of:

```
{ value: "5", label: "Week 5", alternateLabel: "Week 5",
  startDate: "2026-09-30T07:00Z", endDate: "2026-10-07T06:59Z", detail: … }
```

Regular season has 18 entries; postseason has 5, labelled **Wild Card**,
**Divisional Round**, **Conference Championship**, **Pro Bowl**, **Super Bowl**.

This means the picker needs no hardcoded week list, no guessing at postseason
naming, and the date ranges give a "which week is it now" answer for free.
**Ship the calendar inside the existing snapshot** — it is a couple of hundred
bytes and makes the picker instant and available offline.

Skip the Pro Bowl entry, exactly as `snapshotStore` already does.

### Any week's games

`scoreboard?dates=<season>&seasontype=<type>&week=<n>` — already used by
`fetchScoreboard`, so no new upstream client is needed. A future week returns:

- Full fixture list with UTC kickoffs and `venue.fullName`.
- **`week.teamsOnBye[]`** — teams idle that week. Worth showing; it is a
  question this app can't currently answer at all.
- **`competitions[0].odds[0]`** — `details` (`"DAL -3.5"`) and `overUnder`.
  The rest of that object is a wall of sportsbook deep links; take the two
  fields and drop it.
- **`broadcasts[].names`** — `["Prime Video"]`.

**Gotcha:** a future week's competitors carry **no record**. Don't try to fetch
it — the snapshot already holds every team's record, accent and name, so the
client joins by abbreviation. Same reason the week payload needs nothing about
teams beyond their abbreviations.

**Gotcha:** `dates=YYYY` without `week` means the *calendar* year, not the
season, and returns January's games from the previous season. Always pass
`week`. (This already bit us once — see HANDOVER.)

---

## 3. The tab bar problem — solve this first

There is no room for a fourth tab. Measured at 390px:

| | width |
| --- | --- |
| Viewport | 390 |
| Views tab bar (`Table · Picture · Bracket`) | 229 |
| Conference switch (`AFC · NFC`) | 116 |
| **Slack** | **45** |

A fourth tab needs ~70px. Shorter labels don't close a 25px gap, and making the
row scroll hides navigation.

**Proposal: move the AFC/NFC switch out of the global bar.** It is not global
navigation — it only affects the standings and playoff grids, and it is already
hidden on the bracket. Put it in the content area, directly above the conference
block it controls. That frees 116px, leaves ~120px of slack for a fourth tab,
and is a better information architecture besides: global nav stops carrying a
control that applies to two of four views.

Do this as its own commit, before the feature. It is independently verifiable
and keeps the week work from being tangled up in a nav refactor.

---

## 4. Server

### Calendar in the snapshot

Add to `Snapshot`:

```ts
weeks: {
  seasonType: number;      // 2 | 3
  week: number;
  label: string;           // "Week 5", "Wild Card"
  startDate: string;
  endDate: string;
}[];
```

Built in `snapshotStore` from the scoreboard response it already fetches.
Filter out the Pro Bowl.

### `GET /api/week/:seasonType/:week`

Returns the normalised games for that week plus byes:

```ts
interface WeekView {
  seasonType: number;
  week: number;
  label: string;
  games: ScoreboardGame[];   // the existing shape — reuse it
  byeTeams: string[];        // abbreviations
  settled: boolean;          // every game final
}
```

Validate both params as small integers before they reach a URL, the way
`/api/game/:id` does.

### Caching

`snapshotStore` already caches weeks, but only 1..current+1 and keyed by week
number alone. Generalise the key to `${seasonType}:${week}` and reuse the store
rather than adding a second cache:

| Week | TTL |
| ---- | --- |
| Settled (all games final) | forever |
| Current week | it's already on the live/idle refresh cycle |
| Future | ~30 min — kickoff times and odds do move |

---

## 5. Client

### Route

`/week/:slug` — `/week/5` for the regular season, and calendar-derived slugs for
the postseason (`/week/wild-card`, `/week/divisional`, …). Readable, linkable,
and it means the slug list comes from the calendar rather than a second source
of truth. `/week` with no slug resolves to the current week.

Extend `useRoute` the way `?game=` was added — it is already the place that
knows how this app maps URLs to state.

### Data

`useWeek(seasonType, week)`, mirroring `useGameDetail`. Two properties matter
for "smooth":

- **Prefetch the neighbours.** On landing on week N, quietly fetch N−1 and N+1
  so the arrows are instant. A tiny module-level `Map` cache keyed
  `type:week` is enough; weeks don't change while you're looking at them.
- **Never unmount into empty space.** Keep the previous week's content rendered
  until the next resolves, or the page collapses and rebounds on every press.

### Layout

A vertical list — not the horizontal strip. The strip is right for glancing at
the current week inside the standings page; it is wrong as the primary way to
read sixteen fixtures, especially on a phone.

- **Grouped by day**, in the reader's timezone: *Thursday*, *Sunday*, *Monday*.
  This matters more here than in most places — he's reading German time, where
  the Sunday slate lands late evening and Monday night lands Tuesday morning.
- **Per game:** away @ home with logos and accents, each team's record joined
  from the snapshot, kickoff time, venue. Final games show the score with the
  winner emphasised; scheduled games show the spread and broadcast.
- **Divisional games flagged** — both teams sharing a division. Factual, cheap,
  and it's the thing that most often decides the race.
- **Byes listed** at the foot of the week.
- **Tap a game → the existing `GameModal`.** It is already keyed by event id
  alone, which was the point of building it that way. Nothing new needed.

### The current-week marker

Because the standings never move, the week view must always say where it is
relative to now: the picker marks the current week, and any other week carries a
quiet label — *"2 weeks ahead"* / *"last week"* — plus a "back to this week"
control. Cheap to build, and it is the whole defence against someone reading a
future schedule as if the table below had moved with it.

---

## 6. Polish

Roughly in order of value:

1. **Prev / next arrows** with the week label between them. Disabled at the ends
   of the season rather than wrapping.
2. **Prefetch neighbours** (§5) — this is most of what "smooth" means here.
3. **Skeleton rows** on a cold week, reusing `Shimmer`, at the same height as a
   real row so nothing jumps.
4. **Keyboard:** ← / → change week when no modal is open.
5. **Swipe** left/right on touch, with a threshold high enough not to fight the
   page's vertical scroll.
6. **Directional slide** on week change — outgoing content leaves the way you
   came from. Do this with a keyed CSS animation rather than View Transitions:
   it is deterministic, and the VT rules this codebase has already been bitten
   by (unique names, no fading ancestors, `flushSync`) buy nothing here, since
   there is no shared element between one week and the next.

---

## 7. Suggested order

1. Move the conference switch out of the tab bar (§3). Independently shippable.
2. Calendar into the snapshot; week picker renders but doesn't navigate yet.
3. `/api/week/:type/:week` + generalised cache key. Verify a past, current and
   future week by hand.
4. Route, hook, vertical list, byes. Feature works, plainly.
5. Prefetch, skeleton, current-week marker.
6. Arrows, keyboard, swipe, slide.

Test with `CLINCH_SEASON=2025`, which has all 18 weeks plus a real postseason —
the only way to exercise the postseason slugs before January.

---

## 8. Open questions

- **Should the standings page's strip stay as it is?** It becomes a shortcut
  into the week view. Keeping it current-week-only is the simplest story, but
  putting arrows on it too is tempting. Prefer keeping it simple until the week
  view exists and it's clear whether the strip is still wanted.
- **Preseason?** The calendar has it. Almost certainly not wanted, but it is one
  filter either way.
