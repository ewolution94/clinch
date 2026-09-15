Session handover — disposable, delete once absorbed. Updated 2026-09-15 by Claude.

**CLINCH** — NFL standings + playoff picture. Tagline "who's in, who's out."
Tech matches the house pattern: Express+TS backend (`server/`) + Vite/React/TS/
Tailwind v4 frontend (`client/`), SSE for live updates, single process in prod.
Siblings: **PULSE** (`../pulse`, status page) and **HARBOR** (`../harbor`, local
dev dashboard) — same stack, same design language, separate repos.

Run locally: `npm run install:all && npm run dev` — client `:5176`, server
`:4600`. Production is one process: `npm run build && npm start`, which is also
what the Dockerfile does.

## Where it stands

Deployed and in daily use — Eric watches the NFL from Germany and reads this on
his phone. Four views work: standings, schedule (any week), the tiered playoff
picture, and a playable bracket. The last several sessions were his feedback on
a live app rather than new features, so expect small, specific, visual asks.

Newest feature: **German broadcast badges** on the week view — see below.

**Open threads, none started:**

- **Records "as of" a past week.** Repeatedly out of scope — ESPN exposes only
  *current* seeds, so a historical table could show records but never seeds.
  Eric has been told he can ask for it as its own clearly-labelled view; he
  hasn't. Don't fold it into the week browser.
- **The standings page's week strip** is still current-week only. Whether it
  should gain arrows now the `/week` view exists was left open on purpose.
- **Preseason** is filtered out of the calendar. One line either way if wanted.

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
- **UI**: four routes — `/` (standings), `/week/:slug` (schedule), `/playoffs`
  (the tiered picture) and `/bracket` (the tournament tree) — via a small
  history router, no react-router. Dark only. Mobile shows one conference with
  a switch below the tabs; from 1280px both render side by side.
- **Game detail** (`server/src/gameDetail*.ts`, `client/src/components/GameModal.tsx`):
  `/api/game/:id` trims ESPN's ~590 kB summary to ~3 kB. The modal is lazy-loaded
  and owns a `?game=` history entry so back closes it. Opened from the standings
  cards and from played bracket games.
- **Week browser** (`/week/:slug`, `components/WeekView.tsx`): any week of the
  season from ESPN's own calendar, which ships inside the snapshot. Slugs are
  `5` for the regular season and `wild-card`-style for the postseason.
  `/api/week/:type/:week` shares the poll loop's cache. Neighbours are
  prefetched on arrival and on arrow hover.
- **Broadcasts** (`server/src/broadcast.ts`, `broadcastStore.ts`,
  `client/src/components/Broadcast.tsx`): whether Eric can watch a game from
  Germany on RTL or RTL+. Annotated onto `WeekView` on the way out of
  `snapshotStore.week()`, never stored in the ESPN week cache. README's
  "Can I watch this?" is the spec.
- **Bracket** (`client/src/lib/bracket.ts` + `components/Bracket*`): filled only
  by real postseason results or the reader's own picks, with a correct NFL
  reseed between rounds. The connector elbows are SVG in a stretched 100×100
  viewBox — see the comment in `BracketConnectors.tsx` before changing any of it.

## Decisions already made — don't re-litigate

- **A week is a schedule, not a time machine.** The week browser never moves the
  standings, seeds or bracket, and says so on every week but the current one.
  Standings *as of* week N would mean inventing historical seeds, since ESPN
  only exposes current ones — the same rule that governs everything else here.
- **Relative week labels count calendar positions, not week numbers.** The
  postseason restarts at week 1, so arithmetic on the numbers reported "100
  weeks ahead" for the Wild Card round. `relativeLabel` takes the calendar and
  uses indices.
- **Future weeks carry no team records.** Join them from the snapshot by
  abbreviation — every team's record, accent and name is already there.
- **The conference switch is not global navigation.** It lives above the
  conference block it controls. It used to sit in the sticky bar, where it cost
  116px of a 390px row and left no room for a fourth tab.
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
- **German broadcasts have four states, not a boolean.** `confirmed`,
  `candidate`, `unavailable`, `unknown`. RTL names its Sunday picks about a week
  out, so "nobody has announced this yet" and "this is not on" are both common
  and completely different answers. A game is called `unavailable` **only** when
  listings covering its day were actually published; a failed or out-of-horizon
  fetch is `unknown`. Collapsing these to a boolean is the one change that would
  make the feature dishonest — don't.
- **Broadcast matching is on the team pair, never the separator.** German
  listings write home-first with a dash ("Bills – Lions") and away-first with
  "at" ("Giants at Rams"), both in the same week. `teamsInTitle()` scans for all
  32 full names and treats the result as a set; home/away comes from ESPN.
  Parsing the separator will look fine for a week and then silently invert.
- **A German TV day runs past midnight.** The Sunday-night game kicking off
  02:20 Monday is printed on *Sunday's* listings page. `listingsDay()` shifts
  anything before 05:00 Berlin back a day. Reading the calendar date finds
  nothing and calls the game unwatchable.
- **`GAME_PREFIX` has a canary, and it must stay.** The `American Football:`
  title prefix is the one assumption whose failure is *wrong* rather than
  absent — drop a broadcast because the prefix changed and the game reads as
  "not on", the only answer worse than "don't know". So a day carrying football
  programmes of which **none** parse as broadcasts is reported `published:
  false`. A day with no football at all is genuinely a Tuesday and stays
  trusted. Verified by simulating the regression against live HTML.
- **ran.joyn blocks with more than two team names are dropped**, not resolved.
  The prose occasionally runs two fixtures into one paragraph and guessing which
  pair was meant puts a badge on the wrong game. A single name still resolves —
  within a week a team plays once — but only when exactly one game matches.
- **DST is handled and tested.** `berlinWallClockToUtc` resolves the offset
  twice; verified either side of the 25 Oct 2026 CEST→CET fallback, plus the
  spring-forward morning and a CET afternoon kickoff. A one-hour error would not
  produce wrong badges, it would silently lose them (the kickoff would fall
  outside the sanity window), so it is worth keeping tested.
- **TV Spielfilm serves a fallback page past its ~14-day horizon** — today's
  all-channel grid, HTTP 200, no error. The only tell is that the rows belong to
  other channels, so `fetchDay()` requires the requested channel to appear
  before it believes the day. Without that check every far-future week reads as
  "nothing on RTL".
- **RTL+ is not in any TV listing** and its own app API is behind a Didomi
  consent-or-pay wall (consent to ad tracking with 171 partners, or €3.99/mo) —
  both purposes are marked required, so there is no decline-and-continue path.
  The one game it adds per week comes from `ran.joyn.de` instead, which only
  ever describes the *current* week, so it is applied to that week and no other.
  That page is hand-written and ships typos ("Los Ageles Rams"), which is why
  one recognised team is enough to resolve a game — within a week a team plays
  once.
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
- **The modal panel must never be the scrolling element.** The close button is
  absolutely positioned on it; when the panel scrolled, expanding the folded
  sections carried the button off-screen and the dialog could not be closed.
  The panel is a flex column with `overflow: hidden` and an inner
  `.game-dialog__scroll` does the scrolling. Heights use `dvh`, not `vh` —
  `vh` on iOS counts the area behind the browser chrome.
- **Locking background scroll needs `position: fixed` on the body.**
  `overflow: hidden` alone does not hold on iOS. The body is pinned and its
  offset restored on close; the scroll container has `overscroll-behavior:
  contain` and the scrim `touch-action: none`.
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

- **Deployed and live.** `github.com/ewolution94/clinch` is **public**, CI is
  green, and `ghcr.io/ewolution94/clinch:latest` is **public and multi-arch**
  (amd64 + arm64) — verified pullable anonymously, so Portainer needs no
  registry credentials. Running on the NAS behind the Cloudflare Tunnel at
  **clinch.ewolution.cloud**, port 4600, no volume.
- **To redeploy:** commit on `main`, then `git push origin main:release`. That
  branch is the CI trigger; a green run publishes `:latest`, then pull the image
  in Portainer. The Portainer stack must NOT be the repo's `docker-compose.yml`
  — that has `build: .` and would make Portainer build instead of pull. Use an
  `image:`-only stack.
- **The `release`/`main` divergence is resolved locally.** `main` was
  fast-forwarded onto `release` on 2026-09-15 and is the checked-out branch
  again; nothing was pushed. `origin/main` is therefore still behind — the next
  push should be `git push origin main && git push origin main:release`, which
  is also the redeploy. Check `git branch --show-current` before committing.
- **No Docker on the dev machine.** The image is only ever built by CI, so a
  Dockerfile change cannot be smoke-tested locally — push to `release` and watch
  the Actions run.
- **Broadcast sources are scraped HTML, not APIs.** Neither `tvspielfilm.de` nor
  `ran.joyn.de` promises us anything; both were verified to answer Clinch's own
  user-agent (no browser UA needed) and `robots.txt` allows the paths used.
  Volume is ~7 requests per week view behind a 6-hour cache. If either markup
  changes, badges vanish and nothing else breaks — that is by design, and
  `CLINCH_BROADCAST=off` turns the whole thing off.
- **Adding Nitro or Sky is an env change, not code.** `CLINCH_OUTLETS` defaults
  to `RTL,RTL+`; the parser already sees Nitro (`RTL-N`, which carries the free
  Sunday 19:00 *Sky NFL-Konferenz* whiparound) and Sky (`SKYSTE`). Eric was
  asked and chose RTL + RTL+ only.
- **View transitions cannot be verified in the Claude Code browser pane.** It
  reports `document.visibilityState === "hidden"` even when fronted, and
  `startViewTransition` always skips in a hidden document ("Transition was
  aborted because of invalid state"). Name handover, focus, inert and layout are
  all testable there; whether the morph actually *runs* is not. Check that in a
  real browser.
- **Broadcast feature verified** against live listings on 2026-09-15: week 2 six
  of sixteen (five RTL + the RTL+ exclusive Bengals–Texans), week 3 three
  confirmed night games with the Sunday slots correctly `candidate` ("1 of 9"),
  week 8 entirely `unknown`, a past week untouched, a forced-timeout run
  degrading to `unknown` rather than `unavailable`, plus `CLINCH_BROADCAST=off`
  and `CLINCH_SEASON=2025`. Checked at 375px and 1280px.
  **Not yet verified against real listings:** the postseason and Super Bowl, the
  international games (Munich 15 Nov, London, Madrid), Thanksgiving and the
  Saturday weeks. All sit outside the ~14-day horizon, so they can only be
  checked as they come into range — the titles are the thing to look at, since
  a different prefix there would trip the canary and show `unknown` rather than
  anything wrong.
- **Verified over these sessions**: derivation against the *finished* 2025
  season (every clinch/elimination label exactly right, including the 1 seed and
  the 8-9 division winner) and a synthetic week-13 table for the mid-season
  branches; the week endpoint against a settled, a future, a flex-scheduled and
  a postseason week; the modal against final, live, scheduled and overtime
  games. Live 2026 data checked at 390px, 1200px and 1800px, plus the production
  single-process build. **No automated test suite exists** — everything is
  verified by hand in the browser, so budget for that.
- **Eric reviews on a phone first.** Several rounds of feedback were purely
  mobile: type too small, a dialog that couldn't be closed, the page scrolling
  behind a sheet. Check 390px before calling anything done.
- `CLINCH_SEASON=2025` is the fastest way to see the UI with a full season of
  data in it — worth doing before judging any change to the playoff view, since
  week 1 shows almost everything tied.
- **Stop dev servers by exact PID**, never a broad `pkill -f vite` (that once
  killed his unrelated projects). Every verification server from this session
  was stopped.
- `.claude/launch.json` was added so the Claude Code browser pane can start the
  dev server itself (`preview_start`, name `clinch`). It is not needed by
  `npm run dev`.
- **Give commands with a `cd` in them.** Two separate steps were lost to
  commands run from `~/Documents/development` instead of the repo
  (`npm --prefix clinch` resolving to `clinch/clinch`, and a `git push` outside
  a work tree). Self-contained one-liners only.
