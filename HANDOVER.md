# Clinch — handover

Quick orientation for a new session. Updated 2026-09-21, written before moving to
a new MacBook. Detail lives elsewhere: **`README.md`** covers what the app does
and how it's built; **`docs/DECISIONS.md`** holds the traps and hard-won
decisions. Read the relevant part of the latter before changing anything it
covers.

## What it is

NFL standings and the playoff picture on one screen — "who's in, who's out."
Eric watches the NFL from Germany and reads this on his phone. It's live at
**clinch.ewolution.cloud**.

Views: standings (`/`), schedule for any week (`/week/:slug`), playoff picture
(`/playoffs`), a playable bracket (`/bracket`) and settings (`/settings`). Any
game opens a native `<dialog>` (`?game=`). On top of that: German TV badges (is
the game on RTL / RTL+?), a favourite team, calendar export, and settings —
theme (dark / light / creative), English or German, which view to open on,
default conference, and motion.

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

- **All work is committed and pushed.** `release` is at `d8f0655`, the tree is
  clean, CI is green, and `ghcr.io/ewolution94/clinch:latest` is that commit
  (digest verified).
- **The last few sessions were polish on a live app.** In order: German broadcast
  badges; a logo/colour consistency sweep; an SSE shutdown hang; settings with
  light and creative themes; a settings-open freeze on mobile; the sticky tab bar
  (it never stuck); and the game dialog, whose card morph had never worked on a
  first open or on close.
- **`npm run verify` before you push.** Typecheck, lint and 139 tests (`tests/`,
  under a second, no network), which is also the CI gate now — a red run
  publishes no image. It covers the logic that goes quiet for months and then
  has to be right: clinch and elimination, the bracket, the German listings
  parser and its four states, the calendar export.
- **Nothing rendered is tested.** No component or browser tests, so layout,
  colour, motion and the dialog are still verified by hand, on a phone.
  Performance and view-transition checks were done in headless Chrome over CDP,
  because the Claude Code browser pane throttles and freezes while hidden; its
  timings and animation screenshots can't be trusted. Method in
  `docs/DECISIONS.md`.

## Open threads

- **Watchtower (auto-deploy) is written but not applied.** Eric was still due to
  apply `deploy/portainer-stack.yml` in Portainer. Until he does, a push
  deploys nothing: someone has to re-pull the image in Portainer. Ask before
  assuming the NAS runs the latest.
- **The creative theme** has only been verified numerically, never looked at in
  motion by Eric.
- **Broadcast badges past the ~14-day listings horizon** are unverified:
  postseason, the Munich game (15 Nov), Thanksgiving.
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
