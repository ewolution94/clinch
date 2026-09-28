# Clinch — handover

Quick orientation for a new session. Updated 2026-09-28. Detail lives
elsewhere: **`README.md`** covers what the app does
and how it's built; **`docs/DECISIONS.md`** holds the traps and hard-won
decisions. Read the relevant part of the latter before changing anything it
covers.

## What it is

NFL standings and the playoff picture on one screen — "who's in, who's out."
Eric watches the NFL from Germany and reads this on his phone. It's live at
**clinch.ewolution.cloud**.

Six views, named in full in the nav at every width: Standings (`/`), Week
Schedule (`/week/:slug`), Team Schedule (`/team/:abbr`), In the Field
(`/playoffs`), Playoffs — the playable bracket — (`/bracket`) and Settings
(`/settings`). Any game opens a native `<dialog>` (`?game=`). On top of that:
German TV badges (is the game on RTL / RTL+?), a favourite team, calendar
export, and settings — theme (dark / light / creative), English or German,
which view to open on, default conference, and motion.

Any view also takes `?season=2023` and shows that finished season instead —
2021 to 2025 are archived in full. It installs to a home screen and opens
offline, showing the last table it saw.

## Stack and layout

Express + TypeScript server, Vite + React 19 + TypeScript + Tailwind v4 client,
with live updates over SSE. In production it's one process. There is no
database and no state on disk. Data comes from ESPN's public endpoints (no key)
and, for broadcasts, from scraped TV listings (tvspielfilm.de, ran.joyn.de).

```
server/src/   index (API, SSE, static, shutdown) · espn (upstream) · derive
              (seeding, clinch/elimination) · snapshotStore (poll + cache + SSE)
              · broadcast + broadcastStore (German TV) · gameDetail · teams
client/src/   App · components/ · hooks/ · lib/ (settings, strings, theming,
              bracket, status, markWeight — generated)
scripts/      measure-marks.py — regenerates lib/markWeight.ts (Python + Pillow)
deploy/       portainer-stack.yml — the image-only stack the NAS should run
docs/         DECISIONS.md
tests/        the suite + fixtures saved from ESPN and the TV listings
.github/      docker-publish.yml — verifies, then builds the image, on `release`
.claude/      launch.json — lets the Claude Code preview start the dev server
```

## Running it

```bash
npm run install:all && npm run dev
```

Client on **:5176**, API on **:4600**. Production is `npm run build && npm start`.
Node 24 locally; the Dockerfile builds on Node 22. Docker isn't needed on the dev
machine — CI builds the image. `CLINCH_SEASON=2025` shows a full finished season,
which is the fastest way to see the bracket and playoff views with real data.

## Where it's at

- **⚠️ There is uncommitted work in the tree.** Eric commits himself, so it was
  left for him. `release` is at `c9f5b45`; everything since is unstaged.
  `npm run verify` is green over all of it (188 tests, 6 lint warnings — 6 is
  the long-standing baseline, not a regression).
- **Some of it is server-side, so it is not live yet.** `/api/refresh`,
  `/api/team/:abbr/schedule`, `/api/season/:year/team/:abbr/schedule` and the
  snapshot's new fields need a new image. Until that ships, the header's
  refresh button will fall back to showing offline and the team schedule won't
  load.
- **`npm run verify` before you push.** Typecheck, lint and 188 tests (`tests/`,
  about a second, no network), which is also the CI gate — a red run publishes
  no image. It covers the logic that goes quiet for months and then has to be
  right: clinch and elimination, the bracket, the German listings parser and its
  four states, the calendar export, the season archive, and the live-score
  projection.
- **The last sessions, in order:** a test suite and CI gate; the season archive
  (2021–2025); the offline shell; the horizontal-scroll fix; a refresh button
  with a blurred overlay; "apply live scores"; the "how the schedule is made"
  explainer; and the nav rework — full labels, a bar that scrolls sideways, and
  a team's season promoted out of the week view into a tab of its own.
- **Nothing rendered is tested.** No component or browser tests, so layout,
  colour, motion and the dialog are still verified by hand, on a phone.
  Performance and view-transition checks were done in headless Chrome over CDP,
  because the Claude Code browser pane throttles and freezes while hidden; its
  timings and animation screenshots can't be trusted. Method in
  `docs/DECISIONS.md`.

## Open threads

- **The nav's German is a judgement call, and Eric may want it different.**
  Eric named the English tabs himself. German got: Tabelle · Wochen-Spielplan ·
  Team-Spielplan · **Im Feld** · Playoffs · Einstellungen. "Im Feld" mirrors
  "In the Field" and leans on the app's own tagline for the in/out metaphor —
  the alternative was "Playoff-Bild", the established term in German NFL
  coverage, which reads as too close to the "Playoffs" tab beside it. One
  string in `client/src/lib/strings.ts` if he disagrees.
- **A team's season is settled; it took three wrong homes.** Don't move it
  back into the week view — `docs/DECISIONS.md` lists all three placements and
  why each failed, so nobody proposes one of them again.
- **The creative theme** has only been verified numerically, never looked at in
  motion by Eric.
- **Broadcast badges past the ~14-day listings horizon** are unverified:
  postseason, the Munich game (15 Nov), Thanksgiving.
- **The live-score projection duplicates the clinch arithmetic on purpose**
  (`client/src/lib/liveStandings.ts` mirrors `server/src/derive.ts`), because
  shipping a second copy of `conferences` would nearly double every SSE push.
  `tests/liveStandings.test.ts` asserts the two agree; if you change one, that
  test tells you about the other.
- **The iOS Simulator is still not set up.** It runs the real WebKit and is the
  only way to see the bugs that only happen on Eric's phone. One command, and it
  needs his password:
  `sudo /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild -license accept`
- Small, parked: arrows on the standings week strip; showing preseason. Records
  "as of" a past week was declined, because ESPN only exposes current seeds.

## Things that lived only in Claude's memory on the old Mac

These were in `~/.claude/…/memory`, which may not come across with the repo:

- **Work on `release`. Never check out `main`.** Eric's explicit rule; `main`
  sits behind on purpose, so don't "fix" it. Commit on `release` and push it.
- **Hosting:** a Synology NAS running Docker via Portainer, exposed through a
  Cloudflare Tunnel under `ewolution.cloud`. Clinch is on port 4600. The
  Portainer stack must be **image-only**: the repo's `docker-compose.yml` has
  `build: .` and would make the NAS try to compile it.
- **Eric's TV setup:** RTL (free) plus RTL+ Premium; no Sky, no DAZN. Hence the
  `CLINCH_OUTLETS=RTL,RTL+` default.
- The remote is **SSH** (`git@github.com:ewolution94/clinch.git`), so the new Mac
  needs a GitHub SSH key before it can push.

## Working with Eric

He reviews on a phone first, so check ~390px before calling anything done.
The design bar is high. He commits himself: don't commit or push unless asked.
Stop any dev server you start by its exact PID, never with a broad `pkill`.
