<p align="center">
  <img src="brand/banner.svg" alt="Clinch — who's in, who's out." width="100%" />
</p>

# Clinch

**Who's in, who's out.**

NFL standings and the playoff picture on one screen. Built because the NFL
doesn't have a Bundesliga table — it has two conferences, eight divisions, four
division winners who get in regardless of record, and three wild cards who get
in because of it. Clinch shows all of that at a glance, and says plainly which
teams are in the field, which are chasing it, and which are already out.

## Features

- **Both conferences, one screen** — all eight divisions, every team, with
  records, point differential, recent form and current seed. Tap any team for
  its splits, last five results and next kickoff.
- **A playoff picture that isn't guesswork** — seeds 1–7 per conference, the
  cut line drawn as a real object, everyone still alive ranked by how many games
  back they are, and the eliminated set aside.
- **The whole bracket as a tournament tree** — both halves closing on the
  Super Bowl, with each connector lit in the colour of the team travelling along
  it. Rounds fill in **only as games are actually played**; nothing is projected.
  Tap any team to try a result of your own, and the bracket **reseeds after
  every round** exactly like the NFL does.
- **Clinched and eliminated only when the maths says so** — see
  [How the labels are derived](#how-the-labels-are-derived). Nothing here is a
  projection or a win probability.
- **Any game opens** — tap a card on the standings page, or a played game in the
  bracket, for a colour-split scoreboard, the quarter-by-quarter linescore and a
  scoring timeline that names who threw and caught every touchdown.
- **Any week, forwards or back** — next week's fixtures, last month's results,
  or the Wild Card round, grouped by day in your own timezone with bye teams and
  division games called out. Arrows, ← / →, or a swipe.
- **Whether you can actually watch it** — every upcoming game on the schedule
  says whether it's on **RTL** or **RTL+**, the German outlets this is built
  for, and one switch narrows the week to just those. See
  [Can I watch this?](#can-i-watch-this).
- **Your team, starred** — pick a favourite in settings and it's marked in every
  view, its card edged in its colour, and its game leads the schedule and the
  week strip.
- **Into your calendar** — any upcoming game's dialog offers the game as a
  calendar file, or prefilled in Google Calendar, with the kickoff, the channel
  when it's known, and a link back.
- **Games abroad flagged** — Munich, London, Madrid, Mexico City and the rest
  carry a flag and the city, in German where it has a German name.
- **Installs to a home screen, and opens without a signal** — a web manifest,
  icons and a service worker, so it opens full-screen like an app and shows the
  last table you saw on a train with no reception, marked as old rather than
  passed off as current.
- **Every season back to 2021** — the finished ones are browsable in full:
  final table, every result, and the bracket as it was actually played. Pick a
  year in the header.
- **Live during games** — scores and states stream over SSE; the page never
  needs a refresh.
- **Built for a phone first** — the tables drop columns as the space narrows
  using container queries, so a card in a two-column desktop layout stays as
  readable as the same card on a 390px screen.
- **One container** — the built frontend is served by the same Express process
  as the API, and there is no database, no volume and no state on disk.

## The three views

| Route | What it's for |
| ----- | ------------- |
| `/` | **Standings.** All eight divisions under a banner showing where the season is and who leads each conference. Tap a team for its splits, last five results and next kickoff. |
| `/playoffs` | **Playoff picture.** Seeds 1–7, the cut line, everyone still chasing it ranked by games back, and the eliminated. |
| `/bracket` | **Bracket.** The tournament tree, seeded on today's standings and playable. |
| `/week/:slug` | **Schedule.** Any week of the season — `/week/5`, `/week/wild-card` — grouped by day in your own timezone, with byes, division games flagged, and every game opening the same detail modal. |
| `/settings` | **Settings.** Theme, language, favourite team, which view to open on, default conference and motion. |

Any of them takes `?season=2023` and shows that finished season instead — see
[The archive](#the-archive).

### What the week browser does and doesn't do

It changes **which games you are looking at**. The standings, seeds and bracket
always describe *now*, and any week other than the current one says so — "next
week", "3 weeks back", with a way straight back.

Standings *as of* a past week are deliberately absent. ESPN only ever exposes
the **current** `playoffSeed`; records could be recomputed from results, but
seeds could not, and inventing historical ones would break the rule the rest of
the app rests on. A week is a schedule, not a time machine for the table.

## The archive

The five finished seasons before this one — 2021 to 2025 — can be read in full.
Pick a year next to the week in the header, or link straight to one:
`/?season=2023`, `/bracket?season=2022`. A band across the top says which season
you are in and gets you back to the current one.

What an archived season **is**: that season's final table with every label
settled, all 272 results, and the bracket as it was actually played, Super Bowl
included. The schedule opens on its last week rather than its first, because the
ending is the point.

What it **isn't**: the app pointed at an old year. There are no TV badges —
German listings don't go back, and the games are long played — nothing streams,
because nothing changes, and the season's own week list is what it was.

The list stops at 2021 on purpose. ESPN's endpoints go back much further, but
the further back you go the less the data matches what this app assumes: the
17th game arrived in 2021, and the seventh playoff seed in 2020. A season with a
different shape would render, and be quietly wrong.

Each one is built once — 22 upstream requests, about a second and a half — and
then held for as long as the container lives, because a finished season cannot
change. That is also why it is the only response here a browser is allowed to
cache.

### How the bracket fills itself in

Only two things ever place a team in the bracket: **a game that was actually
played**, and **a pick you made yourself**. There is no third fallback — no
"higher seed advances" filling the tree to the Super Bowl with results nobody
played. A bracket that looks decided when nothing is decided is worse than an
empty one.

So for the whole regular season the tree shows the wild card matchups the
current seeding produces, and every later slot says where its team will come
from — *Lowest remaining seed*, *Wild card winner*, *Winner of Game 4*, *AFC
champion*. Come January those slots fill in with the real results and scores as
the rounds are played.

Two structural exceptions are worth knowing:

- **The 1 seed takes its divisional slot immediately.** That's a rule, not a
  prediction — a bye means they play in the divisional round whatever happens.
- **The divisional round needs the whole wild card weekend.** The 1 seed draws
  the lowest remaining seed, so two of three results settle nothing; the round
  stays blank until all three are in.

Picking a winner re-runs the bracket underneath it, reseed included, and is
marked `PICK` so it never reads as a result. A pick that no longer names a team
in its match — because you changed something upstream — is ignored rather than
having to be cleared.

## Local development

```bash
npm run install:all
npm run dev
```

Client: **http://localhost:5176**. API: `http://localhost:4600` (proxied
through `/api` in dev, same-origin in production — no CORS config either way).

### Checks

```bash
npm run verify
```

Typecheck, lint and the test suite — the same three the CI gate runs before an
image is published. Individually: `npm run typecheck`, `npm run lint`,
`npm test`.

The suite is in [`tests/`](tests), runs in about a third of a second, and needs
no network: `node --test` with `tsx`, no test framework. It covers the parts
that are quiet for months and then have to be right —

| | |
| --- | --- |
| **Derivation** | Clinch and elimination labels, seeding, games back, the half-win a tie is worth. Read off the finished 2025 season as a whole table, plus hand-built ones for the branches January can't reach. |
| **The bracket** | The pairings, the reseed after an upset, and the rule that nothing is ever assumed — no chalk, no completed tree. |
| **German broadcasts** | The listings parser against pages saved from the live sources, and the four states a game can be in, which is where this feature's honesty lives. |
| **The calendar export** | RFC 5545 escaping and folding, UTC stamps, the Google link. |
| **Weeks and settings** | Relative labels across the postseason boundary, and the guard that keeps one corrupt preference from costing all of them. |
| **The archive** | That only finished seasons can be asked for, that a season is assembled once and survives a week that didn't answer. |

Nothing rendered is covered — no component or browser tests. Layout, colour and
motion are still checked by hand, on a phone. See
[`docs/DECISIONS.md`](docs/DECISIONS.md) for why the fixtures are real
responses and how the tests were themselves tested.

## Deploying (Docker)

```bash
docker compose up -d --build
```

Then point the Cloudflare Tunnel's public hostname at container port `4600`.
Clinch has no hardcoded origin assumptions and stores nothing, so the container
is disposable — restarting it just re-pulls the league.

That command builds from source. **The deployed stack doesn't** — it pulls the
image CI publishes to `ghcr.io/ewolution94/clinch:latest`, and lives in
[`deploy/portainer-stack.yml`](deploy/portainer-stack.yml). Don't point Portainer
at `docker-compose.yml`: the `build: .` in it would make the NAS compile Clinch
instead of pulling it.

The stack also defines **Watchtower**, which polls the registry every five
minutes and recreates Clinch when a new image appears — so a push to `release`
becomes the entire deploy. It is scoped by label (`WATCHTOWER_LABEL_ENABLE`), so
it only ever touches containers that opt in, and nothing else on the host.

Without it, nothing polls: `:latest` is a tag, not a subscription, and a green CI
run changes nothing on the host until someone re-pulls the image.

### Environment variables

| Variable                  | Default   | Purpose                                                    |
| ------------------------- | --------- | ---------------------------------------------------------- |
| `PORT`                    | `4600`    | Port the server listens on.                                 |
| `CLINCH_SEASON`            | *(live)*  | Pin a season (e.g. `2025`) instead of following the current one. |
| `CLINCH_REFRESH_MS`        | `120000`  | Refresh cadence when nothing is being played.               |
| `CLINCH_LIVE_REFRESH_MS`   | `25000`   | Refresh cadence while a game is in progress.                |
| `CLINCH_SCHEDULE_TTL_MS`   | `3600000` | How long a future week's schedule is trusted before re-fetching. |
| `CLINCH_TIMEOUT_MS`        | `12000`   | Per-request timeout against the upstream feed.              |
| `CLINCH_BROADCAST`         | *(on)*    | Set to `off` to stop looking German broadcasts up entirely.  |
| `CLINCH_BROADCAST_TTL_MS`  | `21600000`| How long a day of TV listings is trusted.                    |
| `CLINCH_OUTLETS`           | `RTL,RTL+`| Which outlets count as watchable — also `Nitro`, `Sky`.      |
| `CLINCH_ARCHIVE_SEASONS`   | `2021…2025` | Finished seasons offered in the season picker.            |

## Where the data comes from

Scores, schedule and standings come from ESPN. German broadcast information does
not — see [Can I watch this?](#can-i-watch-this) — and is the one part of the app
served by a source that could disappear, which is why it fails to a missing badge
rather than a missing page.

ESPN's public NFL endpoints — `standings?level=3` for the division tables,
`scoreboard` for schedule and scores (including the postseason rounds that fill
the bracket in), and `summary?event=` behind `/api/game/:id` for a single game's
detail. No key, no account, no scraping.

`/api/season/:year` is a finished season built from the same endpoints —
standings for the year, all 18 weeks, and the four postseason rounds — and
`/api/season/:year/week/:seasonType/:week` is one of its weeks. Only the years
in `CLINCH_ARCHIVE_SEASONS` are served; the year lands in an upstream URL, so it
is checked rather than trusted.

`/api/game/:id/calendar.ics?lang=de|en` turns that same detail, plus the week's
broadcast, into a one-event calendar file, and `/api/game/:id/google-calendar`
redirects to Google Calendar's add-event page with the same fields filled in.
Google comes first in the UI because Chrome on iOS doesn't hand a calendar file
to the Calendar app the way Safari does.

That last one is ~590 kB per game. The server trims it to ~3 kB by dropping the
21 team stats the UI doesn't show, the per-player boxscores, drives, win
probability, news and video — so a modal costs a browser about as much as a
photograph, not half a megabyte of JSON it would throw away.

The server polls them, keeps the result in memory and serves every client from
that one copy, so the number of people looking at the page has no bearing on how
often ESPN gets asked. Weeks that have finished are never re-fetched, which is
why steady-state traffic is a single request per cycle.

Two things are taken from ESPN as authoritative rather than recomputed:

- **`playoffSeed`** — the conference seed, with the NFL's full tiebreaker chain
  (head-to-head, common games, strength of victory…) already applied. Clinch
  sorts by it rather than reimplementing tiebreakers it would get subtly wrong.
- **Division membership order** is *not* taken from ESPN — it returns division
  entries in its own order, which is not the standings order. Divisions are
  sorted by seed instead, which puts the real leader first.

Teams that haven't kicked off yet come back with `playoffSeed: 0`, which would
otherwise sort them above the entire conference. Those are slotted in by win
differential and the whole conference renumbered — a no-op from the moment every
team has played once.

## Can I watch this?

Clinch is read from Germany, where the NFL is not on one channel you can assume.
**RTL** shows a handful of games a week on free TV and **RTL+** adds one more,
and which games those are changes every week. So every upcoming game on the
schedule carries the answer.

ESPN can't help here — its `geoBroadcasts` are `region: "us"` without exception —
so this comes from German TV listings instead, matched back to the game.

| Badge | Means |
| ----- | ----- |
| **RTL** / **RTL+** (green) | Named in the listings. This one you can watch. |
| **RTL ?** (dashed) | The slot is RTL's, but which game goes in it hasn't been announced. |
| *nothing* | Either not being shown, or nobody has published that far ahead yet — the band at the top of the week says which. |

That third row is the point. RTL names its Sunday picks about a week out, so for
part of the time next week is worth looking at, **the honest answer is that the
pick is still open** — and a badge that guessed would be wrong as often as it was
right. Same rule as [the bracket](#how-the-bracket-fills-itself-in): a game is
only ever called unwatchable when listings covering its day actually exist.
Everything else is left unknown rather than filled in.

Matching is on the **pair of teams**, never the separator: German listings write
the home team first with a dash ("Bills – Lions") and the away team first with
"at" ("Giants at Rams"), often in the same week. The pair identifies the game and
home/away comes from ESPN. Kickoff time is only a guard against a repeat of a
game played weeks earlier — a broadcast starts 0–20 minutes *before* kickoff, for
the pregame, so the time on the badge is when to turn it on.

Two things worth knowing: a German TV day runs past midnight, so the Sunday-night
game that kicks off at 02:20 Monday is printed on Sunday's page; and the listings
only run about a fortnight ahead, which is why a week further out than that says
so instead of showing an empty set.

## Settings

The **Settings** tab (`/settings`) holds preferences, kept in `localStorage` — Clinch still has
no account to sign in to.

| | |
| --- | --- |
| **Theme** | Dark, Light, or Creative — the dark palette with the motion turned up. |
| **Language** | English or German. |
| **Favourite team** | Starred wherever it appears; its game leads the schedule. |
| **Opens on** | Which view you land on, including "where I left off". A shared link always wins over this. |
| **Default conference** | Which one the standings show first on a phone. |
| **Motion** | System, Full, or Reduced. |

Two of these are load-bearing rather than cosmetic:

**Light is a measured theme, not an inverted one.** The tokens are an ordered
scale, so the ramp reverses — but the team accents and the semantic colours were
both hand-picked for a near-black page and fail badly on paper. Measured, only
3 of 32 team accents and 0 of 5 semantic colours cleared 4.5:1 on white; the
Steelers' gold managed 1.58:1. Both sets are darkened towards the ground until
they clear, hue intact, so a win is still green and Miami is still teal. The
check is in the verification list below because it is the thing that silently
rots. The logo plate does *not* invert — it is calibrated to the artwork, and
flipping it would make the Giants, Rams and Jets vanish exactly as they used to.

**Reduced motion beats Creative.** Creative is built entirely from CSS
animations, which means the reduced-motion rules already switch every part of it
off — no special case anywhere. Pick both and you get the palette without the
movement, and the dialog says so rather than leaving you to wonder.

German keeps the football vocabulary in English — *Wild Card*, *Bye*,
*Touchdown*, *Seed*. That is how RTL and ran write it; "Erstrunden-Freilos"
reads as a translation exercise rather than as the sport.

## How team marks are drawn

Every logo in the app is the same object: a mark on a near-paper disc, ringed in
the team's colour. That uniformity is a measurement, not a preference.

The 32 marks span **34× in luminance** — the Giants' at 0.019, the Steelers' at
0.643. On the near-black card ground three of them (NYG, LAR, NYJ) land between
1.2:1 and 2.2:1 and read as coloured smudges; the Jets in particular were a green
blob. On a light disc the *worst* mark in the league is 4.2:1. No single dark
treatment can serve both ends of that range, so the disc is light for all 32 and
the team's colour does its work as a ring — never behind the mark, which is what
erased the Jets, Eagles, Seahawks and Giants in the first place.

The accent is resolved from context rather than passed down, so a chip can't end
up colourless just because whatever drew it only had an abbreviation to hand.

### Watermarks

The oversized mark that turns a card into a banner is the **real artwork, in its
own colours** — full detail, not a silhouette or a tinted wash.

Uniformity comes from measuring instead of flattening. Drawn at one fixed opacity
the 32 marks differ by ~11× in how much of their tile they fill, so the Steelers
and Titans shouted while the Panthers and Jets disappeared, and every card looked
individually tuned. Each asset is measured once at author time — `mean sRGB ×
√coverage`, what the generator calls *ink* — and the correction is baked into
[`markWeight.ts`](client/src/lib/markWeight.ts): opacity trims the heavy marks
back, and a gentle `brightness()` (never more than 1.7×) lifts the faintest.
Measured spread after correction is 1.7×. Regenerate with:

```bash
python3 scripts/measure-marks.py
```

Relative luminance was the obvious measure and it is the wrong one here: it
weights blue at 0.07, so the Giants' solid navy scores 34× below the Steelers,
and correcting by that much turned the mark into a vivid blue slab that dominated
its card.

Two rules keep them out of the way:

- **Placement belongs to the component.** A watermark bleeds off one edge, always
  vertically centred — the right, unless a layout is genuinely mirrored, as the
  game dialog is. It used to take a free-form class and the call sites disagreed:
  mirrored onto the left of one card, dropped into the bottom-right corner of
  another, directly under the score.
- **Only where the right side carries no data.** A dense row has no free corner,
  so the playoff rows have no watermark at all — their record and form dots live
  exactly where it would go.

## How the labels are derived

Every status is settled arithmetic, never a projection. A win counts 1 and a tie
counts ½, so ties stop being a special case; `floor` is the record a team ends on
if it loses out, `ceiling` the record if it wins out.

| Label | Condition |
| ----- | --------- |
| **Eliminated** | The team's ceiling is below the current 7th seed's floor. At least seven teams are already at or above that mark and none of them can lose ground, so the chase is over. |
| **Clinched berth** | The team's floor is above the ceiling of all nine teams currently outside the cut. It finishes ahead of every one of them, so at worst it is the 7 seed. |
| **Clinched division** | The team's floor is above the ceilings of its three division rivals. |
| **Clinched bye** | Clinched the division, and its floor is above every other ceiling in the conference. |
| **On the bubble / In the hunt / Long shot** | Outside the cut by ≤1 / ≤3 / more games. |

These are *sufficient* conditions, not exhaustive ones — a team can be eliminated
in ways this doesn't catch, since that needs full schedule analysis. Clinch
under-claims on purpose: it will occasionally be late to call a team out, and it
will never call one out wrongly.

One thing deliberately not read off the seed number: whether a team is a division
winner or a wild card. Seeds 1–4 are usually the four division leaders, but that
only holds once every team has played, so the role comes from the team's actual
position in its own division.

The bracket applies the same care to reseeding. Its lines are drawn for the
common case — the bye sits next to the 4v5 winner, giving 1v4 and 2v3. But the
NFL reseeds, and after an upset the 1 seed draws whichever survivor is seeded
lowest, which may not be the one the drawn line points at. When that happens the
round says so rather than quietly showing the wrong pairing.

## Tech stack

- **Server**: Node.js, Express, TypeScript, Server-Sent Events. No database, no
  files, no state — an in-memory cache in front of a public API.
- **Client**: React 19, TypeScript, Vite, Tailwind CSS v4. No UI framework, no
  animation library, no icon package; fonts and logos are served locally, so the
  page makes no third-party requests at all.

## Project structure

```
clinch/
├── brand/                  standalone brand assets (mark, logo, banner)
├── server/src/
│   ├── config.ts           env vars
│   ├── espn.ts             upstream client + response normalisation
│   ├── broadcast.ts        German TV listings: fetch + parse
│   ├── broadcastStore.ts   listings cache, matched onto the week's games
│   ├── derive.ts           seeding, clinch/elimination, the bracket
│   ├── snapshotStore.ts    poll loop, week cache, SSE fan-out
│   ├── teams.ts            the 32 teams: division, and a dark-legible accent
│   ├── index.ts            API, SSE, static serving
│   └── types.ts
├── client/public/
│   ├── sw.js               the offline shell
│   ├── fonts/              two variable woff2 files, self-hosted
│   └── logos/              32 team marks, 160px webp, ~230 kB total
├── client/src/
│   ├── components/         Header, SeasonHero, DivisionCard, TeamRow, SeedRow,
│   │                       TeamLogo, TeamWatermark, BracketTree, Broadcast…
│   ├── hooks/              useSnapshot (SSE), useRoute, useMediaQuery
│   └── lib/                types, status ladder, bracket resolver, formatting
├── tests/                  the suite + fixtures saved from the live sources
├── Dockerfile              multi-stage build → single runtime image
└── docker-compose.yml
```

## What this deliberately doesn't do

- **No win probabilities or playoff odds.** Those need a simulation and a model,
  and a number like "63%" invites more trust than it earns. Clinch shows what is
  true right now and what is already settled.
- **No tiebreaker reimplementation.** ESPN's seed is used as given.
- **No accounts, favourites or notifications.** It's a page you open on a Sunday
  evening, read in ten seconds and close.
- **No projected bracket.** See
  [How the bracket fills itself in](#how-the-bracket-fills-itself-in).
