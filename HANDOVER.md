Session handover — disposable, delete once absorbed. Written 2026-09 by Claude.

**PYLON** — NFL standings + playoff picture. Tagline "who's in, who's out."
Tech matches the house pattern: Express+TS backend (`server/`) + Vite/React/TS/
Tailwind v4 frontend (`client/`), SSE for live updates, single process in prod.
Siblings: **PULSE** (`../pulse`, status page) and **HARBOR** (`../harbor`, local
dev dashboard) — same stack, same design language, separate repos.

Run locally: `npm run install:all && npm run dev` — client `:5176`, server
`:4600`. Production is one process: `npm run build && npm start`, which is also
what the Dockerfile does.

## Ports

`4600` (server/container), `5176` (Vite dev). Chosen around what was already
taken on the NAS: 3000/3001/3002 (Axioma ×2, landing) and Pulse's 4400.

## What's built

- **Data**: ESPN's public endpoints, `standings?level=3` + `scoreboard`. No key.
  `server/src/espn.ts` normalises them; `snapshotStore.ts` polls (120s idle /
  25s while a game is live), caches finished weeks forever, and fans the result
  out over SSE. No database, no disk, no volume — the container is disposable.
- **Derivation** (`server/src/derive.ts`): seeding, division order, clinch and
  elimination, games back, the wild card bracket. README's "How the labels are
  derived" is the spec; read it before touching this file.
- **UI**: two routes, `/` (standings) and `/playoffs`, via a ~20-line history
  router — no react-router. Dark only. Mobile shows one conference with a
  switch; from 1280px both render side by side.

## Decisions already made — don't re-litigate

- **ESPN's `playoffSeed` is authoritative.** It has the NFL's full tiebreaker
  chain applied. Reimplementing head-to-head/common-games/strength-of-victory
  would be a lot of code that is subtly wrong all season.
- **No playoff odds or win probabilities.** Every label is settled arithmetic —
  sufficient conditions only, so Pylon is sometimes late to call a team out and
  never calls one out wrongly. A "63%" would invite trust it can't earn.
- **Division winner vs wild card comes from `divisionRank`, not the seed
  number.** Seeds 1–4 are only the four division leaders once every team has
  played; in week 1 a second-place team can hold seed 4. This was a real bug.
- **Unranked teams are normalised, not dropped.** ESPN returns
  `playoffSeed: 0` before a team's first game, which sorted it above the whole
  conference. `normaliseSeeds()` slots them in by win differential. No-op from
  week 2 onward — but it *is* load-bearing every September.
- **Row columns use container queries, not viewport breakpoints.** With both
  conferences side by side a division card is ~420px on a 1800px screen —
  narrower than the same card on a phone. Viewport breakpoints overflowed it.
  If you add a column, gate it on `@…/card`, never on `sm:`/`lg:`.
- **`TeamWatermark` exists because Tailwind emits `.relative` after
  `.absolute`.** `TeamLogo` sets `relative` on itself, so a positioning class
  passed in from outside silently loses and the watermark stays in flow. Don't
  merge the two components back together.
- **Fonts and logos are served locally** (two variable woff2 files, 32 webp
  marks, ~290 kB total). The page makes no third-party requests — no Google
  Fonts, no ESPN CDN hotlinking.

## Process notes

- **Not pushed to GitHub yet.** Local repo initialised, one commit. Plan mirrors
  Pulse: create `ewolution94/pylon`, add the remote, push `main`, then push a
  `release` branch to trigger the first GHCR build. Before that first release
  push the repo needs **Settings → Actions → General → Workflow permissions →
  "Read and write permissions"**, or the push to GHCR fails — not the default
  on new repos.
- **CI** is `.github/workflows/docker-publish.yml`, copied from Pulse's working
  pattern: push to `release` → multi-arch (amd64 + arm64, for the NAS) → GHCR.
- **Verified this session**: derivation checked against the *finished* 2025
  season (every clinch/elimination label came out exactly right, including the
  1 seed and the 8-9 division winner) and against a synthetic week-13 table for
  the mid-season branches. Live 2026 week 1 verified in the browser at 390px,
  1200px and 1800px, plus the production single-process build (SPA fallback,
  immutable asset headers, SSE). No automated test suite exists.
- `PYLON_SEASON=2025` is the fastest way to see the UI with a full season of
  data in it — worth doing before judging any change to the playoff view, since
  week 1 shows almost everything tied.
- No Pylon processes left running — the dev server and the production
  verification process were both stopped by exact PID.
