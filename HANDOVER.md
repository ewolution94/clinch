Session handover — disposable, delete once absorbed. Updated 2026-09-17 by Claude.

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
picture, and a playable bracket, now with themes, German, and preferences.

**Repo state at handover:** branch `release` at `ee4a9dd`, working tree clean,
pushed, CI green, and `ghcr.io/ewolution94/clinch:latest` resolves to that same
commit. `main` sits one commit behind and **should be left alone** (see the
branch rule below). Nothing is half-finished in the tree.

The last four sessions, newest first:

1. **Settings** — a cog in the header: theme (dark/light/creative), language
   (en/de), landing route, default conference, motion. Plus the creative-theme
   fix below.
2. **Logo system** — one chip everywhere, watermark weight normalised per mark.
3. **Server shutdown** — SSE streams no longer hang SIGTERM.
4. **German broadcast badges** on the week view.

**Open threads:**

- **⚠️ Watchtower is written but almost certainly not applied.**
  `deploy/portainer-stack.yml` contains the image-only stack with Watchtower in
  it, and the docs below describe the deployed behaviour — but Eric said he'd do
  the Portainer side "tomorrow" on 2026-09-16 and it has not been confirmed
  since. **Ask before trusting any claim that the NAS auto-updates.** If it
  isn't applied, a green CI run still changes nothing until someone hits
  Recreate with "re-pull image" in Portainer.
- **Creative theme needs a human eye.** The motion was verified numerically
  (transform sampled over time), not visually, because the browser pane paints
  nothing while hidden. Eric had not confirmed it looks right at handover.
- **Broadcast coverage past the ~14-day horizon is unverified** — the
  postseason, the Munich game (15 Nov), Thanksgiving, the Saturday weeks. They
  can only be checked as they come into range.
- **RTL+ beyond the one exclusive game.** Its own app API is behind a
  consent-or-pay wall; Eric asked me to try and I declined to consent on his
  behalf. `ran.joyn.de` covers the current week only. Ask before going further.
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
  history router, no react-router. Three themes (see Settings). Mobile shows one
  conference with a switch below the tabs; from 1280px both render side by side.
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
- **Settings** (`client/src/lib/settings.ts`, `useSettings.tsx`, `strings.ts`,
  `accentFor.ts`, `themedSnapshot.ts`, `components/SettingsDialog.tsx`): theme,
  language, landing route, default conference, motion — one versioned
  localStorage key, PLANUM's pattern. The light palette, the per-theme accent
  darkening and the creative keyframes each have a trap documented below; read
  those before touching any of it. `client/index.html` carries a boot script
  that applies the theme before first paint, and it **duplicates**
  `applySettings()` on purpose — keep the two in step.
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
- **Shutdown must end the SSE streams itself.** `server.close()` waits for open
  connections to finish, and an event stream never finishes — so with a single
  browser tab connected the close callback never fired and the process just sat
  there. Pressing Ctrl+C again made it worse: every press called
  `server.close(cb)` again and each call registers another one-shot `close`
  listener, which is where `MaxListenersExceededWarning: 11 close listeners
  added to [Server]` came from. The warning was the symptom, the open stream was
  the cause. `index.ts` now tracks open streams, ends them on the signal, guards
  against a second signal re-entering, and force-exits after a 3s unref'd grace.
  If you add another long-lived connection type, it has to join that set.
  Reproduce the old behaviour with: start the server, `curl -sN .../api/stream`,
  then `kill -TERM` — it used to hang forever.
  In production this was every container restart eating Docker's full 10s
  SIGTERM grace before the SIGKILL.
- **Settings live in `clinch-settings-v1`, ported from PLANUM.** One key, and
  `normalize()` merges field by field onto the defaults — a corrupt value costs
  that one setting, not all of them. Verified: `{"theme":42,"lang":"de",
  "landing":"nonsense","motion":"reduced"}` keeps the German and the reduced
  motion and defaults only the two bad fields. Don't replace it with a trusting
  `JSON.parse`.
- **The light theme is measured, and the measurement is the feature.** The token
  ramp reverses cleanly, but the 32 team accents *and* the five semantic colours
  (brand/gold/jade/ice/live) were picked for a near-black page: on white only
  3 of 32 accents and 0 of 5 semantics cleared 4.5:1, gold at 1.58:1. Both are
  darkened — accents at runtime in `lib/accentFor.ts`, semantics as literals in
  the `[data-theme="light"]` block. Both target ~5.4:1 against white rather than
  4.5, because the card grounds are tinted; targeting 4.5 exactly left real rows
  at 4.06. Re-run the in-page contrast audit after touching any of it.
- **`--color-plate` must not follow the theme.** It is a constant of the
  *artwork* — a light disc is the only ground all 32 marks clear 3:1 on. It is
  written with literal hexes for that reason. Inverting it on light brings back
  the invisible Giants.
- **⚠️ A keyframe must never restate an element's resting transform.** Tailwind
  v4 centres with the *individual* `translate` property (`translate: 0 -50%`),
  and CSS applies `translate` and `transform` independently — so a keyframe whose
  `transform` repeats that -50% gets it applied **twice**. That was the bug
  behind "lots of team logos mispositioned": every watermark sat 61px above its
  card. Keyframes here express only the movement (`translate3d(0, -9px, 0)`),
  never the position. Same trap bit `bloom-wander` horizontally. Check with
  `getComputedStyle(el).translate` — if it isn't `none`, your transform stacks.
- **Creative's motion has to be fast enough to see.** The first pass ran at
  26s / 19s / 15s with ±5px amplitudes, and Eric's verdict was simply "not
  motion" — a sway that slow is an expensive still image. Now 13s / 9s / 7.5s /
  6s with ±9px drift, 80px bloom travel and a 1.0→1.22 breathe. Verified by
  sampling the computed transform over time rather than by eye, since the
  Claude Code browser pane paints nothing while hidden even though the
  animation clock keeps running (`document.visibilityState` is always "hidden"
  there — sample `currentTime` and the matrix, don't screenshot).
- **Creative is CSS-only, deliberately.** `field-drift`, `bloom-wander`,
  `mark-drift` and `.hero-sweep` are keyframes gated on
  `:root[data-theme="creative"]`. That is why "creative but reduced-motion"
  needs no code: the existing reduced-motion rules clamp every animation to
  0.01ms. Verified — 21 animations, none running meaningfully. If you add
  creative motion in JS, you have to defeat it by hand, so don't.
- **Motion has three states and the media query is scoped.**
  `@media (prefers-reduced-motion: reduce)` is wrapped in
  `:root:not([data-motion="full"])` so a reader can opt *back into* motion on an
  OS that asks for less. Removing that scope silently breaks the Full setting.
- **The settings dialog does not reuse `GameModal`'s overlay,** on purpose —
  leave them apart; four view-transition bugs were paid for in that component.
- **⚠️ The settings dialog must not make the app `inert`.** It did, and that
  was the "freezes when I tap the cog" Eric reported from his phone. Making the
  whole shell inert restyles all ~1,600 nodes. Measured in headless Chrome on a
  phone viewport at 4–6× CPU throttle, with a warm browser and a fresh page:
  the old build ran a 53–82ms blocking task on first open, and the new one
  none. `inert` by itself, isolated, costs 64–74ms at 6×. An `aria-hidden`
  control on the same subtree cost 0.2ms, so the cost is style and
  interactivity work, not the accessibility tree. `useDismissable` now traps
  Tab inside the dialog and relies on `aria-modal` plus the full-screen scrim
  button, which gives the same guarantees at no cost.
- **`useDismissable` reads `onClose` through a ref.** It used to be an effect
  dependency, and App passed an inline arrow. So every re-render while the
  dialog was open — every setting tapped — tore the whole lock down and rebuilt
  it: scroll restored, the gear behind the sheet refocused, the body re-pinned.
  Measured: 3 taps caused 21 lock mutations; now 0. App's callbacks are
  `useCallback`s as well, but the ref is what actually guards it.
- **The settings scrim has no `backdrop-filter`, and ambient motion pauses under
  dialogs.** A full-screen blur over two `blur(150px)` blooms that animate
  forever means a phone GPU re-blurs the whole screen every frame. At 80%
  opacity a plain scrim looks the same. `useDismissable` sets
  `data-overlay` on the root and index.css pauses the sheen, field lines,
  blooms, watermark drift and hero sweep underneath. This was not measurable
  here — headless compositing isn't a phone GPU — so it rests on reasoning,
  not numbers.
- **Accents are themed once, in `themedSnapshot()`.** Components read
  `team.accent` in 35 places; rewriting the snapshot is what keeps a theme from
  being a 35-site change. It is a no-op on dark and creative.
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
  `showModal()` provided reproduced explicitly: a Tab trap, an Escape handler,
  scroll lock, `aria-modal`, and focus returned to the card **by
  `data-game-id`**. It used to use `inert` on the whole app instead of the Tab
  trap; that restyled every node on each open (64–74ms blocking at 6× CPU, and
  inside the transition callback, so it also delayed the morph). **Don't put
  `inert` back** — see the settings note below for the measurements.
- **The sticky controls bar is a sibling of `<header>`, not its child.** Inside a
  164px `<header>` it had nowhere to stick to and scrolled away with the logo,
  tabs and cog included (bar top 100 / 40 / −50 / −300 / −800 at scroll
  0 / 60 / 150 / 400 / 900). Header.tsx now returns a fragment, so the bar's
  parent is the page. It keeps sticking while a dialog pins the body, because
  its containing block still spans the viewport — measured at 0 with both
  dialogs open, so it needs no special case. Don't wrap it back inside `<header>`
  or any short container.
- **Nothing above a `view-transition-name`d element may animate opacity.** The
  modal's dim/blur started life *on* the overlay that wraps the panel. At
  capture time that ancestor is at `opacity: 0` (the fade has just begun), so
  the panel's snapshot is captured transparent: the morph runs and is invisible,
  and all you see is the fade with the old page snapshot over it. The dim is now
  a **sibling** scrim, and `.game-overlay` is deliberately effect-free — no
  opacity, filter, backdrop-filter, transform or animation. If you add any of
  those to it, the morph silently disappears again.
- **⚠️ The game dialog must not be rendered through `React.lazy`/`Suspense`.**
  This used to say "awaiting `import()` first is enough". It wasn't: `lazy`
  suspends on its *first* render even when the chunk is already downloaded,
  because it only learns that by awaiting the module once. That first render
  happens inside the transition callback, so on the **first open of every visit**
  the browser captured the Suspense fallback, and the card just faded out. The
  morph only ever ran from the second open onwards. Measured in headless
  Chrome: first open had only `::view-transition-old(game-…)`, the second had
  the full group. `loadGameModal()` in App.tsx now holds the component itself
  and puts it in state (on idle, on tap, or on a `?game=` arrival), so it is a
  plain value that renders synchronously. The chunk is still split out
  (13.8 kB).
- **⚠️ `closeGame` must change state synchronously.** It used to close by
  calling `history.back()` and waiting for `popstate`. `back()` is async, so
  inside the transition callback nothing had changed yet: the browser captured
  the dialog as its own "after" state, morphed it into itself, and the dialog
  vanished a moment later. **The closing morph had never worked.** It also meant
  closing a shared `?game=` link — the tab's own first entry — did a real
  `back_forward` navigation **out of the site**. Now: `setGame(null)` first, then
  `back()` only for an entry the app pushed (marked `clinchGame` in
  `history.state`, guarded against a double close), and `replaceState` for an
  arrived-on one. Verified: open morph, close morph (card holds the name at
  capture), browser/Android back still closes, and a deep-link close stays in
  the document.
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
  draws a neutral plate ringed in the team colour instead. Don't "restore the
  glow".
- **The logo plate is light for every team, and that is arithmetic.** Measured
  over all 32 marks (percentile luminance of the opaque pixels, WCAG contrast
  against each candidate ground): the marks span **34×**, NYG 0.019 to PIT 0.643.
  On the card ground NYG is 1.24:1, LAR 1.77:1, NYJ 2.21:1 — the Jets were a
  green blob. On a near-paper disc the worst team in the league is **4.2:1**, and
  contrast improves monotonically as the plate lightens past ~70% paper. There is
  no dark plate that serves both ends of that range, so don't "tone the disc down
  to fit the theme" — it will silently re-break those three. The white halo that
  used to lift dark marks is gone; on a light plate it only muddied the bright
  ones.
- **Watermarks are the real artwork, and must stay that way.** They shipped once
  as accent-filled silhouettes (logo-as-mask). It was perfectly uniform and Eric
  rejected it on sight — "less cool", he wanted the logos back in full glory.
  Uniformity now comes from measurement instead: `scripts/measure-marks.py`
  measures each asset's *ink* (`mean sRGB × √coverage`) and writes
  `client/src/lib/markWeight.ts`; `TeamWatermark` applies a per-mark opacity
  multiplier plus a gentle `brightness()`. Don't reintroduce masking, and don't
  hand-edit the generated table.
- **Use "ink", not relative luminance, to judge a mark's weight.** Luminance
  weights blue at 0.072, so the Giants' solid navy measures 34× below the
  Steelers; correcting by that factor produced `brightness(3.4)` and a vivid blue
  slab that dominated the NFC East card — visibly worse than the problem. Mean
  sRGB tracks apparent presence far better, and the √coverage term separates a
  big solid shape from a thin outline. Under ink the faintest marks are the
  Panthers and Jets, which is what the eye agrees with. Spread: 11× raw → 1.7×
  corrected, with brightness never above 1.7.
- **The brightness/alpha caps are deliberately mild.** This is artwork; pushing
  harder to close the last of the gap distorts it. A near-black mark being
  slightly quieter than a bright one is honest.
- **Watermark placement lives in the component, deliberately.** One edge,
  vertically centred; `side="left"` exists only for the genuinely mirrored game
  dialog. It used to take a className and the call sites diverged — SeasonHero
  mirrored the NFC card's mark onto the left, straight under its own logo, and
  SeedRow bled its mark into the bottom-right corner where the record and form
  dots live. **A watermark may only go where the right side carries no data**,
  which is why `SeedRow` now has none.
- **Accents come from context (`lib/accents.tsx`), not props.** A chip could
  otherwise render grey simply because its caller only had an abbreviation — that
  was the real reason the schedule strip and the opponent chips inside an
  expanded row looked different from every other mark. Don't reintroduce
  "pass the accent down three levels".
- **Fonts and logos are served locally** (two variable woff2 files, 32 webp
  marks, ~290 kB total). The page makes no third-party requests — no Google
  Fonts, no ESPN CDN hotlinking.

## Process notes

- **Deployed and live.** `github.com/ewolution94/clinch` is **public**, CI is
  green, and `ghcr.io/ewolution94/clinch:latest` is **public and multi-arch**
  (amd64 + arm64) — verified pullable anonymously, so Portainer needs no
  registry credentials. Running on the NAS behind the Cloudflare Tunnel at
  **clinch.ewolution.cloud**, port 4600, no volume.
- **⚠️ Work on `release`. Never check out `main`.** Eric said so directly on
  2026-09-17 after it happened twice. `release` is the CI branch and the one he
  lives on; don't "tidy up" the divergence between the two, and don't
  fast-forward `main` onto it. This supersedes the older advice in this section.
- **To redeploy:** commit on `release` and push it. That branch is the CI
  trigger; a green run publishes `:latest`. **If** the Watchtower stack has been
  applied on the NAS it then updates itself within ~5 minutes — but see the open
  thread above: that was never confirmed, so assume a manual Portainer pull
  ("Recreate" with re-pull image) until Eric says otherwise.
  The stack is `deploy/portainer-stack.yml`; it must NOT be the repo's
  `docker-compose.yml`, which has `build: .` and would make Portainer build
  instead of pull.
- **Portainer does not poll, and never did.** `:latest` is a tag, not a
  subscription — before Watchtower, a green CI run changed nothing on the NAS
  until someone hit Recreate with "re-pull image". Worth remembering if
  Watchtower is ever removed.
- **Watchtower is scoped by label and that is load-bearing.**
  `WATCHTOWER_LABEL_ENABLE=true` means it only touches containers carrying
  `com.centurylinklabs.watchtower.enable=true`. Drop that env var and it starts
  auto-updating everything else on the NAS — Axioma, PLANUM, the landing page.
- **Watchtower's image is pinned and carries no enable label of its own**, so it
  never updates itself: it mounts the Docker socket, which is root-equivalent on
  the host, and an unattended auto-update of that is a worse trade than a manual
  version bump. Note the upstream `containrrr/watchtower` is **archived** (last
  release Nov 2023); the stack uses the maintained fork
  `nickfedor/watchtower` (github.com/nicholas-fedor/watchtower), same flags and
  the same `com.centurylinklabs.*` labels.
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

### What has actually been verified

All by hand — **there is no automated test suite**, so budget for that.

- **Derivation** against the finished 2025 season: every clinch/elimination
  label correct, including the 1 seed and the 8-9 division winner. Plus a
  synthetic week-13 table for the mid-season branches.
- **Contrast, measured in the page** rather than eyeballed (the audit script is
  worth rebuilding if you touch colour): light went 55 failing → **0 of 608**
  elements; dark is 0. The one flagged "AFC" is the gradient-clipped heading,
  whose `color` is transparent, so the probe can't read it — a false positive.
- **Logos**: 169 chips across all four routes at 375px and 1280px, live 2026 and
  `CLINCH_SEASON=2025`. None missing plate or ring, none without a team colour,
  **zero glyph overlaps** with any watermark. The game dialog is the one
  intentional exception — its marks sit behind the header text by design.
- **Broadcasts** against live listings: week 2 six of sixteen (five RTL + the
  RTL+ exclusive), week 3 correctly `candidate`, week 8 `unknown`, a forced
  timeout degrading to `unknown` rather than `unavailable`.
- **Settings**: German day/month names render while *Wild Card* and *Bye* stay
  English; landing redirects from `/` only and `/week/3` deep-links through;
  creative + reduced clamps all 21 animations; the corrupt-value guard keeps
  good fields and defaults only bad ones.
- **Shutdown**: SIGTERM with one, three and twelve signals, and three `tsx
  watch` reloads with a stream held open — all exit in 0s with no warnings.

**Performance: don't time things in the Claude Code browser pane.** It is
always `visibilityState: "hidden"`, so timers get throttled harder the longer
the page sits: the same second open of the settings dialog measured 14ms early
in a session and 4.5s later on. What worked was the local Chrome
(`/Applications/Google Chrome.app`) run headless and driven over CDP with
Node's built-in `WebSocket`: a 390×844 @3x mobile viewport,
`Emulation.setCPUThrottlingRate` at 4–6, tap → double-rAF to the first real
frame, and a `longtask` PerformanceObserver. Serve two builds side by side
(proxying `/api` to the dev server) and **alternate which runs first**. The first
measurement in a fresh Chrome process carries a ~110ms cold-start task whichever
build it is, and that confound made the fixed build look worse in one run. Two gotchas
in writing the driver: Chrome may bind the debugging port to IPv6 `::1`, so
pass `--remote-debugging-address=127.0.0.1`; and attach the WebSocket `open`
listener (or check `readyState`) *before* any `await`, or the event can fire
unheard and the script hangs forever on `about:blank`. Kill spawned Chromes by
PID — a hung driver leaves them behind. The scripts were scratch files and are
not in the repo.

**Not verified, and needing a human or time:**

- **Whether creative actually looks good in motion.** Sampled numerically only.
- **View transitions can't be exercised in the Claude Code pane** — it is always
  `hidden`, so `startViewTransition` skips. **Headless Chrome can,** and that is
  how the two broken morphs above were found: it reports `visible`. Wrap
  `document.startViewTransition` in the page to capture the transition, await
  `.ready`, then read `document.getAnimations()` for
  `::view-transition-new(game-<id>)`. Also read which element holds the name
  at that moment: the panel on open, the card on close. A group can form
  panel→panel and look like success, so check the DOM, not just the pseudos.
  Screenshots there are reliable too (`Page.captureScreenshot`). The pane's are
  frozen frames after a scroll.
- **Broadcasts beyond the ~14-day listings horizon** — postseason, Munich,
  Thanksgiving, Saturday weeks.
- **The Dockerfile**, since there is no Docker on the dev machine: push to
  `release` and watch the Actions run.

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
