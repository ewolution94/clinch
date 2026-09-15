Session handover — disposable, delete once absorbed. Written 2026-09 by Claude.

**CLINCH** — NFL standings + playoff picture. Tagline "who's in, who's out."
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
- **UI**: three routes — `/` (standings), `/playoffs` (the tiered picture) and
  `/bracket` (the tournament tree) — via a ~25-line history router, no
  react-router. Dark only. Mobile shows one conference with a switch; from
  1280px both render side by side.
- **Game detail** (`server/src/gameDetail*.ts`, `client/src/components/GameModal.tsx`):
  `/api/game/:id` trims ESPN's ~590 kB summary to ~3 kB. The modal is lazy-loaded
  and owns a `?game=` history entry so back closes it. Opened from the standings
  cards and from played bracket games.
- **Bracket** (`client/src/lib/bracket.ts` + `components/Bracket*`): filled only
  by real postseason results or the reader's own picks, with a correct NFL
  reseed between rounds. The connector elbows are SVG in a stretched 100×100
  viewBox — see the comment in `BracketConnectors.tsx` before changing any of it.

## Planned next

`docs/PLAN-week-browser.md` — browse any week of the season (schedule, results,
byes, odds) as its own view. Written 2026-09-15 with the ESPN side researched:
the scoreboard's `leagues[0].calendar` already describes every week and names
the postseason rounds, future weeks carry byes/odds/broadcast but **no team
records** (join those from the snapshot instead), and a fourth tab does not fit
at 390px — measured, and the plan proposes moving the AFC/NFC switch out of the
global bar to make room. Deliberately out of scope: standings *as of* a past
week, since ESPN only exposes current seeds and inventing historical ones would
break the rule the rest of the app rests on. Not started.

## Decisions already made — don't re-litigate

- **The bracket's connectors are arithmetic, not measurement.** Round columns
  spread their matches with `flex-1`, so match *i* is always at (i + 0.5) / n of
  the column height — identical in every column at every size. That's why the
  elbows are a stretched SVG with fixed fractions instead of JS measuring DOM
  positions and re-measuring on resize. If you change how a round column lays
  its matches out, this breaks silently and invisibly.
- **The bracket never projects a winner.** It shipped once defaulting to chalk —
  higher seed advances — which filled the tree to the Super Bowl with games
  nobody had played. Eric asked for that out: only a real result or an explicit
  pick places a team, and every other slot says where its team will come from.
  Don't reintroduce a "complete the bracket" default; an empty slot is the
  honest state, and earlier screenshots showing a full tree in September are
  the behaviour that was removed.
- **Real playoff results come from ESPN `seasontype=3`** (weeks 1/2/3/5 —
  week 4 is the Pro Bowl). Only fetched once the regular season is over, since
  there is nothing to read before that. `snapshot.postseason` is empty all season
  and that's correct, not a bug.
- **The divisional round waits for the whole wild card weekend.** The 1 seed
  draws the lowest remaining seed, so two of three results settle nothing. The
  bye team does take its divisional slot immediately — that's a rule, not a
  prediction.
- **ESPN's `playoffSeed` is authoritative.** It has the NFL's full tiebreaker
  chain applied. Reimplementing head-to-head/common-games/strength-of-victory
  would be a lot of code that is subtly wrong all season.
- **No playoff odds or win probabilities.** Every label is settled arithmetic —
  sufficient conditions only, so Clinch is sometimes late to call a team out and
  never calls one out wrongly. A "63%" would invite trust it can't earn.
- **Division winner vs wild card comes from `divisionRank`, not the seed
  number.** Seeds 1–4 are only the four division leaders once every team has
  played; in week 1 a second-place team can hold seed 4. This was a real bug.
- **Unranked teams are normalised, not dropped.** ESPN returns
  `playoffSeed: 0` before a team's first game, which sorted it above the whole
  conference. `normaliseSeeds()` slots them in by win differential. No-op from
  week 2 onward — but it *is* load-bearing every September.
- **Row columns use container queries, not viewport breakpoints.** With both
  conferences side by side a division card is ~400px on a 1800px screen —
  narrower than the same card on a phone. Viewport breakpoints overflowed it.
  If you add a column, gate it on `@…/card`, never on `sm:`/`lg:`.
- **Nicknames are hidden on narrow cards, records and form are not.** When the
  row was made bolder the names started truncating to "Pat…" / "Commande…". The
  logo and abbreviation already identify the team, and every data column beats a
  half-word — so the nickname is what gives way, from `@sm/card` down.
- **`TeamWatermark` exists because Tailwind emits `.relative` after
  `.absolute`.** `TeamLogo` sets `relative` on itself, so a positioning class
  passed in from outside silently loses and the watermark stays in flow. Don't
  merge the two components back together.
- **The modal must NOT be a top-layer `<dialog>`.** It shipped as
  `<dialog>`+`showModal()` for the free focus trap, and the morph looked broken:
  Chromium does not capture top-layer elements in a view transition, so the
  panel's `view-transition-name` never formed a group and the only thing
  animating was the root cross-fade — leaving a snapshot of the page painted
  *over* the opening modal. It is now a plain fixed overlay, with everything
  `showModal()` provided reproduced explicitly: `inert` on the app shell, an
  Escape handler, scroll lock, and focus returned to the card **by
  `data-game-id`** (going inert blurs the card before the modal's effect runs,
  so `document.activeElement` is already the body by then).
- **Nothing above a `view-transition-name`d element may animate opacity.** The
  modal's dim/blur started life *on* the overlay that wraps the panel. At
  capture time that ancestor is at `opacity: 0` (the fade has just begun), so
  the panel's snapshot is captured transparent: the morph runs and is invisible,
  and all you see is the fade with the old page snapshot over it. The dim is now
  a **sibling** scrim, and `.game-overlay` is deliberately effect-free — no
  opacity, filter, backdrop-filter, transform or animation. If you add any of
  those to it, the morph silently disappears again.
- **The modal's chunk is awaited before the transition starts.** It is still
  lazy, but `onOpenGame` does `await import(...)` first — otherwise the render
  inside the transition can produce the Suspense fallback, and the browser
  captures no panel to morph into.
- **A `view-transition-name` must exist on exactly ONE card, only while it
  morphs.** This was the actual bug behind "the games section is layered on top
  of the modal", and it took three attempts to find. A name is not a label: it
  *lifts the element out of the page* into the transition layer, which paints
  above everything. Every card carried one permanently, so opening a modal built
  seventeen groups — sixteen floating cards plus root — and the cards after the
  clicked one in DOM order painted over the morphing panel. `App` now grants the
  name to a single card via `morphCardId` immediately before the snapshot and
  clears it on `transition.finished`. At rest, `getComputedStyle` should report
  `view-transition-name` on **nothing** but the implicit `root`; if you ever see
  a card with one while idle, this regressed.
- **The view-transition morph needs `flushSync`, and a unique name.**
  `startViewTransition` snapshots the DOM the moment its callback returns, and
  React would still be holding the state update — without `flushSync` the
  browser captures the old DOM twice and nothing animates. Separately, a
  `view-transition-name` must be unique at capture time, so the card *drops* its
  name as the dialog takes it (`openGameId` is threaded down for exactly this).
  Two elements sharing a name silently skips the transition, with no error.
  `main.tsx` sets `html.vt` so the CSS fallback entrance stands down where the
  morph runs; the lazy chunk is warmed on idle so the first open can morph too.
- **Unplayed quarters must be gated on `status.period`.** ESPN reports a quarter
  that hasn't happened as `'0'`, not as absent, so a game in the 1st quarter
  would otherwise render as three scoreless ones. Overtime adds linescore
  entries beyond `format.regulation.periods` — don't assume four columns.
- **Team colour never goes *behind* a logo.** The first version put a blurred
  disc of the team's accent behind the mark, which erased the Jets, Eagles,
  Seahawks and Giants — their logos are the same hue as their brand. `TeamLogo`
  now draws a neutral light plate ringed in the team colour, plus a faint white
  halo to lift dark marks off the page. All 32 were compared side by side before
  settling on it; don't "restore the glow".
- **Fonts and logos are served locally** (two variable woff2 files, 32 webp
  marks, ~290 kB total). The page makes no third-party requests — no Google
  Fonts, no ESPN CDN hotlinking.

## Process notes

- **Not pushed to GitHub yet.** Local repo initialised, five commits on `main`.
  Plan mirrors
  Pulse: create `ewolution94/clinch`, add the remote, push `main`, then push a
  `release` branch to trigger the first GHCR build. Before that first release
  push the repo needs **Settings → Actions → General → Workflow permissions →
  "Read and write permissions"**, or the push to GHCR fails — not the default
  on new repos.
- **CI** is `.github/workflows/docker-publish.yml`, copied from Pulse's working
  pattern: push to `release` → multi-arch (amd64 + arm64, for the NAS) → GHCR.
- **View transitions cannot be verified in the Claude Code browser pane.** It
  reports `document.visibilityState === "hidden"` even when fronted, and
  `startViewTransition` always skips in a hidden document ("Transition was
  aborted because of invalid state"). Name handover, focus, inert and layout are
  all testable there; whether the morph actually *runs* is not. Check that in a
  real browser.
- **Verified this session**: derivation checked against the *finished* 2025
  season (every clinch/elimination label came out exactly right, including the
  1 seed and the 8-9 division winner) and against a synthetic week-13 table for
  the mid-season branches. Live 2026 week 1 verified in the browser at 390px,
  1200px and 1800px, plus the production single-process build (SPA fallback,
  immutable asset headers, SSE). No automated test suite exists.
- `CLINCH_SEASON=2025` is the fastest way to see the UI with a full season of
  data in it — worth doing before judging any change to the playoff view, since
  week 1 shows almost everything tied.
- **A Clinch dev server is still running** on `:5176`/`:4600`, started this
  session so Eric could keep looking at it — stop it with `npm run dev`'s own
  process or by exact PID, not a broad `pkill -f vite` (that once killed his
  unrelated projects). Every throwaway verification server was stopped.
