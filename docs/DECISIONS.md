# Clinch — decisions and gotchas

The hard-won detail behind the code: traps that each cost real time to find,
and the reasoning behind choices that look arbitrary but aren't. Read the
relevant section **before** changing that part of the app. Most entries record a
measurement and the bug that followed from ignoring it.

Moved here verbatim from `HANDOVER.md` on 2026-09-21, so the handover could stay
short. For what the app does and how it's built, see `README.md`.

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
  `mark-drift`, `.hero-sweep` and — since 2026-09-22 — the sheen are keyframes
  gated on `:root[data-theme="creative"]`. That is why "creative but reduced-motion"
  needs no code: the existing reduced-motion rules clamp every animation to
  0.01ms. Verified — 21 animations, none running meaningfully. If you add
  creative motion in JS, you have to defeat it by hand, so don't.
- **Motion has three states and the media query is scoped.**
  `@media (prefers-reduced-motion: reduce)` is wrapped in
  `:root:not([data-motion="full"])` so a reader can opt *back into* motion on an
  OS that asks for less. Removing that scope silently breaks the Full setting.
- **⚠️ Settings is a page (`/settings`), not a sheet — and why.** It was a
  bottom sheet opened from a cog. On Eric's iPhone (Chrome, i.e. WebKit) it
  "froze when I tap the cog", and kept doing so through four rounds of fixes,
  each of which removed something real and measurable:
  1. `inert` on the whole app restyled ~1,600 nodes per open (64–74ms at 6×
     CPU) — replaced by a Tab trap and `aria-modal`.
  2. `onClose` as an effect dependency tore the lock down and rebuilt it on
     every render while open (21 lock mutations for 3 taps) — read through a
     ref instead.
  3. A full-screen `backdrop-filter` scrim, and ambient motion that never
     stopped (the idle page cost 420–460ms/s of compositing) — plain scrim,
     motion creative-only.
  4. Pinning the body to lock scrolling re-laid out and repainted the whole
     page on open and close — replaced by `overflow: hidden` on the body.
  After the fourth it felt clean at first, then froze again "after some time"
  on tapping the toggle. Unexplained, and not reproducible anywhere measurable
  here (headless Chrome is Blink; the phone is WebKit). So on 2026-09-22, at
  Eric's request, it became an ordinary route: no overlay, no scroll lock, no
  focus handling. **For whoever builds a sheet again:** get a recording from
  the phone first (the iOS Simulator runs the real WebKit — see Process
  notes). Leads not yet ruled out: something that only builds up over time
  (the SSE stream or a reconnect after the phone sleeps, both of which
  re-render the whole app); WebKit-specific cost in toggling a theme (every CSS
  variable changes, so everything repaints, blurs included); and "the toggle"
  may have meant a setting inside the sheet rather than the cog. The last
  version of the sheet is in git history before this change
  (`client/src/components/SettingsDialog.tsx`, `lib/useDismissable.ts`).
- **⚠️ The page must be completely still when nothing is happening.** Outside
  Creative there is no infinite animation anywhere, and that is measured, not
  taste. The sheen — a 9s opacity drift on the two floodlight blooms and every
  division banner — changed what sits behind each `backdrop-filter` on the
  page (sticky bar, hero, division cards), so every one of those blurs was
  recomputed every frame, forever. With compositing forced onto the CPU (see
  Process notes), the idle dark page cost **420–460ms of CPU per second**;
  with the sheen held still it is **0–4ms**. Knocking out each suspect alone
  pinned it: stopping only the 150px bloom *filter* changed almost nothing;
  removing every backdrop-filter halved it; stopping the sheen removed all of
  it. On a 120Hz phone that was a GPU that never rested, and every dialog
  animation had to fight it for frames. If you add ambient motion, gate it on
  Creative, and never animate anything that sits behind a backdrop-filter.
- **Ambient motion pauses under the game dialog.** GameModal sets
  `data-overlay` on the root, and index.css pauses whatever motion is left
  underneath — only Creative has any now.
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
- **⚠️ The game dialog is a native `<dialog>`, and the card→dialog morph is
  gone. Don't bring view transitions back.** Removed on 2026-09-22 at Eric's
  request, after it had been rebuilt four times and still broke: the dialog
  sometimes refused to close, the blur flickered on WebKit (snapshots are
  painted with compositing layers flattened, and backdrop-filter only exists as
  a compositing layer there), and each fix traded one engine's bug for
  another's. Everything it needed is gone with it — `morphCardId` threaded
  through four components, `view-transition-name` handed to exactly one card at
  a time, `flushSync` around the update, `data-morph` on the root, `html.vt`,
  and a scrim that had to outlive the dialog to fade out. `GameModal` now calls
  `showModal()` and gets the focus trap, Escape, the top layer, `aria-modal`
  and focus restored to the card for free; the dim and blur are one element
  inside it (`.game-dialog__veil`). The old reason for hand-building the
  overlay — that view transitions can't see the top layer — no longer applies.
  Verified: opens from the strip, closes by button, backdrop tap (including a
  drifting one), Escape and the back button; the URL, the scroll lock and focus
  come back clean each way, and a tap on the panel never closes it.
- **The sticky controls bar is a sibling of `<header>`, not its child.** Inside a
  164px `<header>` it had nowhere to stick to and scrolled away with the logo,
  tabs and cog included (bar top 100 / 40 / −50 / −300 / −800 at scroll
  0 / 60 / 150 / 400 / 900). Header.tsx now returns a fragment, so the bar's
  parent is the page. It keeps sticking while a dialog locks scrolling —
  measured at 0 with both dialogs open, scrolled — **as long as the lock is on
  the body, not on `<html>`** (see the scroll-lock entry). Don't wrap it back
  inside `<header>` or any short container.
- **The favourite's game is pinned, never duplicated.** The week view lifts it
  out of its day group into "Your team" rather than showing it twice. A second
  card would carry the same `data-game-id`, which is how the dialog finds its
  way back — and it was worse under the old morph, where two elements sharing a
  `view-transition-name` silently skipped it. The pinned card also survives the "On TV" filter, because your own
  team's kickoff is worth seeing even when you can't watch it.
- **The favourite star is drawn in the team's colour, not gold.** Gold already
  means "division leader" on the playoff picture, and a favourite isn't a status.
- **Games abroad are keyed on ESPN's venue country, not `neutralSite`.** The
  2026 schedule has nine, and all nine are `neutralSite: true` — but so is a
  Super Bowl in New Orleans. `country !== "USA"` is the rule; the client maps
  the country to a flag and gives the city its German name ("München",
  "Mexiko-Stadt"). "Saint-Denis" is shown as Paris, which is how the NFL sells it.
- **Calendar: the file leads, Google's add-event link is second, both from the
  server.** Both come from one `gameEvent()` in `server/src/calendar.ts`,
  because only the server's week data knows the channel. The file is first
  because it is the only one that can reach a calendar on an iPhone (see the
  entry below). It is sent `inline` **only to Safari**, which turns that into
  its "Add to Calendar" sheet; every other browser ignores an inline calendar
  and does nothing visible — on Chrome for iOS the tap looked like it had
  failed — so they get `attachment` and show their own download UI. The dialog
  also says where the file went once it's tapped, because the page cannot tell
  whether it landed.
- **⚠️ A link cannot put an event into the Google Calendar app on an iPhone.**
  Settled on the device, twice. iOS hands a link to `calendar.google.com` to
  the installed Google Calendar app, and the app ignores `action=TEMPLATE`
  entirely — it opens, empty. A 302 through our own domain behaves the same,
  and so does a page that forwards itself by script (`googleCalendarPage()`,
  kept because it is right everywhere else): iOS still counts it as the same
  tapped navigation. Don't spend more time on it — the app is the blocker, not
  the link. Hence the file first on a phone, Google second for desktop and
  Android. To get games *into* Google Calendar from the iPhone, the route is
  his Google account added to the iOS Calendar app as the default calendar;
  then the file lands in Google.
- **The way out of the game dialog is a button, not the backdrop.** A 52px
  round close button floats above the panel (`.game-dialog__close`), centred
  on a phone. Tapping the backdrop is a convenience on top of it, and Escape
  still works. It got there the long way: the backdrop tap missed about one
  time in twenty, because a tap that drifts a few pixels is a drag to the
  browser, which then sends no click. Pointer events with 32px of slop fixed
  that in synthetic tests (0/6/12/28px of travel close, 85px doesn't), but Eric
  reported it *worse* on the phone — so the dialog stopped depending on it.
  The button sits outside the panel, where it can't be scrolled out of reach —
  the risk the old corner ✕ inside the panel carried. It is inside the
  `<dialog>`, so the native focus trap covers it.
- **The game dialog is loaded as a value, not through `React.lazy`.**
  `loadGameModal()` in App.tsx holds the component itself and puts it in state
  (on idle, on tap, or on a `?game=` arrival), so it renders synchronously; the
  chunk is still split out (13.8 kB). This was load-bearing while the dialog
  morphed — `lazy` suspends on its *first* render even with the chunk already
  downloaded, so the browser captured the Suspense fallback and the morph never
  ran on a first open. The morph is gone, but a dialog that opens on real
  content instead of a flash of skeleton is worth keeping.
- **⚠️ `closeGame` must change state synchronously.** It used to close by
  calling `history.back()` and waiting for `popstate`. That meant closing a
  shared `?game=` link left the site entirely: the entry is the tab's own, not
  one this app pushed, so "back" went wherever the reader came from — confirmed
  as a real `back_forward` navigation. State changes first now, and the URL
  follows: our own entry is popped, an arrived-on one is rewritten in place.
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
- **Background scroll is locked with `overflow: hidden` on the body — not a body
  pin, and not on `<html>`.** `lib/scrollLock.ts`. This replaced pinning the
  body at `position: fixed; top: -scrollY`, which moved every layer on the
  page, so WebKit re-laid out and repainted the whole visible page on every
  open and again on close (and the game dialog did it *inside* the view
  transition's update). The reason for the pin is gone: WebKit fixed
  `overflow: hidden` not stopping touch scrolling in 2021 (bug 153852), and its
  last loophole — scrolling once Safari's toolbar had collapsed — in Safari
  26.4 (bug 240859). Belt and braces: both overlays are `touch-action: none`,
  so a drag anywhere but the dialog's own scroller has nothing to pan, whatever
  a browser makes of the lock. **On the body, not `<html>`:** the body's own
  `overflow-x: hidden` is normally handed to the viewport; give `<html>` an
  overflow and the body keeps its own and turns into a scroll container around
  the whole page — measured: the sticky bar jumped 20px out of place, and
  WebKit would rebuild the page into a new scrolling layer. Verified with touch
  drags: page stays put under drags on the scrim and the sheet header, the
  settings list still scrolls, scroll position survives close untouched.
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
- **The offline shell is a service worker, and it is network-first on purpose.**
  `client/public/sw.js`. Installed to a home screen the app looked like an app
  but opened like a website — a blank screen until the network answered. Three
  rules, and the reasoning is the part worth keeping: navigations and API data
  go to the **network first** and fall back to the cache, because cache-first
  would mean a deploy cannot reach a reader who keeps the app installed, and
  this ships several times a week; fingerprinted files under `/assets/` go
  cache-first, since a hit is always correct; and a snapshot served from the
  cache is rewritten with `stale: true` on the way out, so the page shows the
  banner it already has for old data instead of presenting last Sunday's table
  as this Sunday's. Three things learned the hard way while verifying it:
  - **`fetch(request)` inside a worker can be answered by the browser's own
    HTTP cache**, so "network first" quietly meant "HTTP cache first" — a stale
    snapshot arrived looking live and a redeployed shell never landed. Every
    network-first fetch passes `cache: "no-store"`. `/api/snapshot` is now sent
    `no-store` by the server too, for the same reason.
  - **A navigation request cannot be re-created with different options** (the
    Request constructor rejects mode `navigate`), so the shell is fetched by URL
    instead. One cached entry answers every route, which also stops a `?game=`
    link putting a copy of the shell in the cache per game.
  - **The worker precaches what the shell names.** It is a plain file the
    bundler never sees, so it cannot know this build's hashed filenames — it
    reads them back out of the HTML it just fetched. Without that, a reader who
    installs the app and is next offline gets an unstyled page, because nothing
    but the HTML was cached.
  - **⚠️ The worker fetches the snapshot itself, and that line is load-bearing.**
    The page asks for `/api/snapshot` once, when it mounts — and on a first
    visit that request is already in flight before the worker is installed, let
    alone controlling the page, so it never reaches the fetch handler and
    nothing lands in the data cache. Eric installed the app, closed it, turned
    on flight mode, opened it again and got the shell with no data in it. The
    install step now fetches the snapshot too: one extra request, on the first
    visit ever, and the difference between an app that works offline and one
    that only looks like it does. Don't delete it because "the page already
    fetches that" — the page fetching it is exactly what cannot be relied on.
  - **Live scores are handed over when the app goes into the background.** They
    arrive over SSE, which the worker never sees, so its copy would otherwise be
    whatever the last page *load* fetched — an app left open through a Sunday
    would still show the 19:00 table on Tuesday. `useSnapshot` posts the current
    snapshot to the worker on `visibilitychange`, which is the moment before it
    might next be opened with no signal, and cheaper than writing to the cache
    every 25 seconds through a game.
  **How to verify it, and two ways this has already been got wrong.** Drive a
  headless Chrome through the real sequence — one ordinary visit, navigate away,
  **stop the server**, visit again — and assert on what renders.
  - Don't use CDP's offline emulation. `Network.emulateNetworkConditions`
    applies to the page's network context and not the worker's, so the worker
    keeps fetching happily and every offline assertion passes for the wrong
    reason. Stop the server instead: that is offline for everybody.
  - Don't let the script fetch anything by hand. The first version of this test
    did `fetch("/api/snapshot")` after the worker took control, which populated
    the data cache — work the real app does not do. It passed, shipped, and
    failed on Eric's phone the same evening. **The test must do nothing the app
    would not do.**
  Checked, after both: installs and takes control, precaches the shell, JS, CSS
  and fonts, caches the snapshot at install, restores the data cache when the
  app is backgrounded, boots with the server down showing the last table marked
  stale, never serves `/api/stream` from cache, and a redeploy still reaches an
  installed reader.
- **An archived season is a separate store, not a season argument.** 2021–2025,
  `server/src/archiveStore.ts`, `/api/season/:year`. `SnapshotStore`'s week
  cache is keyed by week alone — correct while only one season is ever in it,
  and silently wrong the moment 2023's week 3 can land in the same slot as this
  week's. The archive keys by year as well, caches the *promise* rather than the
  result (so two readers on a cold container don't both spend 22 requests), and
  deletes a season that failed to build so one bad afternoon upstream doesn't
  break that year until the container restarts. A finished season cannot change,
  so it is held forever and is the one response here a browser may cache.
  The list stops at 2021 deliberately: the 17th game arrived that year and the
  seventh seed in 2020, so an older season would render and be quietly wrong.
- **⚠️ Elimination asks `finishesAhead`, not ceiling-against-floor.** Found by
  the archive: Seattle finished 2023 at 9-8, level with the Packers, who took
  the last NFC place on tiebreakers — and the raw comparison only had Seattle's
  ceiling *equalling* the cut's floor, so it read "on the bubble" in January
  with no games left to play. `finishesAhead` already handled the settled case
  for clinching (both teams done, level, the seed decides); elimination now uses
  it too. Live-season behaviour is unchanged — it is a strict generalisation.
- **The season lives in the URL, not in settings.** `?season=2023`, preserved
  across every navigation by `useRoute`. It is a property of what you are
  looking at rather than a preference: a link to the 2023 table should open the
  2023 table for whoever you send it to. Changing season drops the week, because
  `/week/14` of 2023 and of this season are different pages and the one you were
  reading may not exist in the other.
- **The season picker is a native `<select>`.** It is the one control that has
  to open on top of everything else, and every hard bug in this app has been an
  overlay. On iOS the native one is a wheel the reader already knows. It sits
  where the year was already printed in the header, so it costs no width on a
  phone — the sticky row below is already five tabs wide.
- **The tests cover what goes quiet and then has to be right.** `tests/`, run
  with `npm test`. Four choices in it are deliberate:
  - **Node's own runner, and no test framework.** `node --test` with `tsx` for
    the TypeScript. The suite added three devDependencies to the repo root and
    nothing to either package; the same reasoning as no UI framework and no
    icon package.
  - **The fixtures are real responses, not shapes invented to pass.** The 2025
    standings are ESPN's own JSON, trimmed to the fields `espn.ts` declares.
    The listings are the anchor tags lifted verbatim out of a live TV Spielfilm
    page — including a Sunday-night game printed on Sunday and timed 02:00 on
    Monday — and out of a genuinely past-horizon request, which answers with 25
    other channels' programmes and no RTL row at all. The ran.joyn page is kept
    with its own typos ("Septmeber", "Los Ageles Rams"), because surviving
    those is the documented behaviour. Re-cut them from live sources rather
    than editing them by hand.
  - **The 2025 season is the golden table, and it earns its place.** Carolina
    won the NFC South at 8-9 and is seeded above two 12-5 teams; Green Bay
    finished 9-7-1, so the half-win currency is load-bearing; Denver and New
    England both finished 14-3, so the bye rests entirely on the settled-seed
    tiebreak. ESPN returns the AFC West as LAC, KC, LV, DEN — the division
    winner last — which is what the sort-by-seed exists to fix.
  - **Every test was checked by breaking the code.** 46 mutations, each
    reverting one documented decision (chalk in the bracket, the parser canary,
    ties as whole wins, `unavailable` for an unknown day, folding `.ics` by
    character); all 36 turned the suite red. Two early versions of tests passed
    against a broken build and were rewritten — a test nobody has seen fail is
    not yet evidence of anything. The script was scratch, not in the repo;
    doing it again by hand is a few minutes' work and worth it when you add a
    test to this suite.

  What it does **not** cover: anything rendered. No component, browser or
  visual tests — layout, colour, motion and the dialog are still checked by
  hand, and on a phone. `snapshotStore`, the SSE fan-out and `index.ts` are
  untested too; they are mostly I/O and shutdown sequencing, and the shutdown
  behaviour has its own reproduction in the entry above.

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

**By the suite** (`npm test`, 139 tests, ~0.7s) — derivation, the bracket, the
listings parser and the four broadcast states, the calendar export, the season
archive, week labelling and the settings guard. See the testing entry above for what it
deliberately doesn't cover.

**By hand**, everything below, and everything visual. There is no browser or
component test, so anything about layout, colour or motion is still a person
looking at it.

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

**Chrome on an iPhone is WebKit.** Every iOS browser is. So anything that
differs between Blink and WebKit — view-transition snapshots, backdrop-filter,
scroll locking — cannot be seen from headless Chrome, and it is where the
hardest bugs here came from. The Mac has Xcode and an iOS runtime installed;
once the Xcode licence is accepted
(`sudo /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild -license accept`
— `xcode-select` points at the Command Line Tools, so plain `xcodebuild`
fails), the iOS Simulator runs the real iOS WebKit and is the way to check.

**GPU cost, approximated: run Chrome with `--disable-gpu`.** Compositing then
happens on the CPU, and `SystemInfo.getProcessInfo` over CDP reports the GPU
process's CPU time — blurs, filters and layer blending included. Diff it over
a few idle seconds and around an interaction. That is how the always-animating
page was found (420–460ms/s idle → 0–4ms/s). Knock suspects out one at a time
by injecting a `<style>` and re-measuring.

**Filming a transition: pause and seek it over CDP.** Racing screenshots
against a running animation lies (captures lag the screen). Instead listen for
`Animation.animationStarted`, `Animation.setPaused` every animation, then
`Animation.seekAnimations` to exact times and screenshot each. It catches CSS
transitions too. And `Page.captureScreenshot`'s `clip` is in *document*
coordinates — on a scrolled page it photographs the wrong region.

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
- **Animation and dialog behaviour can't be exercised in the Claude Code pane**
  — it is always `hidden`, so animations freeze and its screenshots are frozen
  frames. Headless Chrome reports `visible` and its `Page.captureScreenshot` is
  reliable; drive input with `Input.dispatchTouchEvent` and check state with
  `Runtime.evaluate`. Two traps met while testing the dialog: the profile
  persists `localStorage` between runs, so "where I left off" silently
  redirects a later run to another route — set the settings key first; and a
  `Input.dispatchTouchEvent` can hang after certain sequences, so give every
  protocol call a timeout and print results as they come rather than at the
  end.
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
