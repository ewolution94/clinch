import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldBackdrop } from "./components/FieldBackdrop";
import { Header } from "./components/Header";
import { ConferenceStandings } from "./components/ConferenceStandings";
import { PlayoffColumn } from "./components/PlayoffColumn";
import { BracketTree } from "./components/BracketTree";
import { WeekGames } from "./components/WeekGames";
import { teamMap } from "./lib/teams";
import { AccentProvider } from "./lib/accents";
import {
  SettingsProvider,
  useLocale,
  useSettings,
  useStrings,
} from "./lib/useSettings";
import { themedSnapshot } from "./lib/themedSnapshot";
import { SeasonHero } from "./components/SeasonHero";
import { Legend } from "./components/Legend";
import { Skeleton } from "./components/Skeleton";
import { ConferenceSwitch } from "./components/ConferenceSwitch";
import { WeekView } from "./components/WeekView";
import { SettingsView } from "./components/SettingsView";

// Kept out of the main bundle: most visits never open a game.
type GameModalComponent = (typeof import("./components/GameModal"))["default"];
let loadedGameModal: GameModalComponent | null = null;

/**
 * The game dialog's chunk, loaded by hand rather than through `React.lazy`.
 *
 * `lazy` suspends on its *first* render even when the chunk is already
 * downloaded — it only learns the module is there by awaiting it once. The
 * dialog's first render happens inside the view-transition callback, so on the
 * first open of every visit that render produced the Suspense fallback, the
 * browser captured nothing under `game-<id>`, and the card simply faded out
 * instead of morphing into the dialog. Measured in headless Chrome: first open
 * had only `::view-transition-old(game-…)`; the second had the full group.
 * Awaiting `import()` beforehand (the old mitigation) warms the module, not
 * `lazy`'s internal state. Holding the component ourselves means it is a plain
 * value by the time it is rendered, so it renders synchronously.
 */
function loadGameModal(): Promise<GameModalComponent> {
  return import("./components/GameModal").then((module) => {
    loadedGameModal = module.default;
    return module.default;
  });
}
import { useSnapshot } from "./hooks/useSnapshot";
import { useRoute, type Route } from "./hooks/useRoute";
import { DESKTOP_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
import { formatClock } from "./lib/format";
import type { ConferenceId, ConferenceView } from "./lib/types";

const NO_CONFERENCES: ConferenceView[] = [];

export default function App() {
  return (
    <SettingsProvider>
      <Clinch />
    </SettingsProvider>
  );
}

function Clinch() {
  const { settings, hydrated, update } = useSettings();
  const locale = useLocale();
  const t = useStrings();
  const { snapshot: raw, connection } = useSnapshot();
  // Accents are picked for the dark page; on light they are remapped once here
  // so every `team.accent` read downstream is already correct.
  const snapshot = useMemo(
    () => (raw ? themedSnapshot(raw, settings.theme) : raw),
    [raw, settings.theme],
  );
  const [GameModal, setGameModal] = useState<GameModalComponent | null>(
    () => loadedGameModal,
  );
  const { route, navigate, game, openGame, closeGame, weekSlug, openWeek } =
    useRoute();
  const [conference, setConference] = useState<ConferenceId>("AFC");
  const wide = useMediaQuery(DESKTOP_QUERY);

  /*
   * Preferences land one tick after the first paint, because they come from
   * localStorage. `applied` makes sure the landing route and the conference are
   * taken once, on that first read — not again every time a setting changes,
   * which would yank the reader back to their landing view mid-session.
   */
  const applied = useRef(false);
  useEffect(() => {
    if (!hydrated || applied.current) return;
    applied.current = true;

    const wanted =
      settings.conference === "last"
        ? (settings.lastConference ?? "AFC")
        : settings.conference;
    setConference(wanted);

    // Only ever from the bare root. A shared link to /week/3 or /bracket is the
    // reader asking for that page, and outranks a default.
    if (window.location.pathname !== "/") return;
    const target =
      settings.landing === "last"
        ? (settings.lastRoute ?? "standings")
        : settings.landing;
    if (target !== "standings" && target !== "last") navigate(target as Route);
  }, [hydrated, settings, navigate]);

  const onConference = useCallback(
    (next: ConferenceId) => {
      setConference(next);
      if (settings.conference === "last") update({ lastConference: next });
    },
    [settings.conference, update],
  );

  const onRoute = useCallback(
    (next: Route) => {
      navigate(next);
      // "Where I left off" means a view of the season, never the settings page.
      if (settings.landing === "last" && next !== "settings")
        update({ lastRoute: next });
    },
    [navigate, settings.landing, update],
  );

  const conferences = useMemo(() => {
    if (!snapshot) return [];
    return wide
      ? snapshot.conferences
      : snapshot.conferences.filter((c) => c.id === conference);
  }, [snapshot, wide, conference]);

  /** The schedule strip carries abbreviations only; it needs this for colours. */
  const teams = useMemo(
    () => (snapshot ? teamMap(snapshot) : new Map()),
    [snapshot],
  );

  useEffect(() => {
    const view =
      route === "playoffs"
        ? "Playoff picture"
        : route === "bracket"
          ? "Bracket"
          : route === "week"
            ? "Schedule"
            : route === "settings"
              ? "Settings"
              : "Standings";
    document.title = snapshot
      ? `${view} · ${snapshot.week.label} — Clinch`
      : "Clinch";
  }, [snapshot, route]);

  // Arriving on a `?game=` link opens the dialog before any tap could load it.
  useEffect(() => {
    if (!game || GameModal) return;
    let live = true;
    void loadGameModal().then((Modal) => {
      if (live) setGameModal(() => Modal);
    });
    return () => {
      live = false;
    };
  }, [game, GameModal]);

  // Load the dialog once the page is idle, so the first tap has it to hand.
  useEffect(() => {
    const warm = () =>
      void loadGameModal().then((Modal) => setGameModal(() => Modal));
    const idle = window.requestIdleCallback?.(warm);
    if (idle === undefined) {
      const timer = setTimeout(warm, 1500);
      return () => clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, []);

  const onOpenGame = useCallback(
    async (id: string) => {
      // The component in hand before the dialog opens, so it shows content
      // rather than a flash of skeleton — see loadGameModal().
      const Modal = await loadGameModal();
      setGameModal(() => Modal);
      openGame(id);
    },
    [openGame],
  );

  return (
    <AccentProvider snapshot={snapshot}>
      <div className="min-h-screen">
        <FieldBackdrop />

        {/*
          No `inert` here any more. It used to hold focus and the accessibility
          tree outside the game dialog (the job showModal() did before the top
          layer broke the morph), but making the whole app inert restyles every
          node on each open — measured as a 64–74ms blocking task at 6× CPU. The
          dialogs now trap Tab themselves and rely on `aria-modal`, and their
          full-screen scrims stop pointers reaching the page.
        */}
        <>
          <Header
            snapshot={snapshot}
            connection={connection}
            route={route}
            onRoute={onRoute}
          />

          <main className="mx-auto max-w-[1800px] px-4 pt-5 pb-16 sm:px-6 lg:px-10">
            {/* Settings doesn't wait for the league: it works offline too. */}
            {route === "settings" ? (
              <SettingsView
                conferences={snapshot?.conferences ?? NO_CONFERENCES}
              />
            ) : !snapshot ? (
              <Skeleton connection={connection} />
            ) : (
              <div className="flex flex-col gap-6">
                {snapshot.stale && (
                  <p className="rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2 font-mono text-[14px] text-gold">
                    {t.staleData}
                  </p>
                )}

                {route === "standings" ? (
                  <>
                    <SeasonHero snapshot={snapshot} />
                    <WeekGames
                      games={snapshot.games}
                      teams={teams}
                      label={snapshot.week.label}
                      onOpenGame={onOpenGame}
                    />
                    {!wide && (
                      <ConferenceSwitch
                        value={conference}
                        onChange={onConference}
                      />
                    )}
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6">
                      {conferences.map((c) => (
                        <ConferenceStandings key={c.id} conference={c} />
                      ))}
                    </div>
                    <Legend />
                  </>
                ) : route === "week" ? (
                  <WeekView
                    snapshot={snapshot}
                    slug={weekSlug}
                    onOpenWeek={openWeek}
                    onOpenGame={onOpenGame}
                  />
                ) : route === "bracket" ? (
                  <BracketTree snapshot={snapshot} onOpenGame={onOpenGame} />
                ) : (
                  <>
                    {!wide && (
                      <ConferenceSwitch
                        value={conference}
                        onChange={onConference}
                      />
                    )}
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6">
                      {conferences.map((c) => (
                        <PlayoffColumn key={c.id} conference={c} />
                      ))}
                    </div>
                    <Legend />
                    {/* Below the table: the seeds are what the page is for. */}
                    {snapshot.season.type === 2 &&
                      snapshot.week.number <= 4 && (
                        <p className="rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 font-display text-[14.5px] leading-relaxed text-mist">
                          It&apos;s {snapshot.week.label.toLowerCase()} of{" "}
                          {snapshot.week.total} — nearly every team is still
                          within a game of the cut, so the seeding below moves a
                          lot each Sunday. It starts holding its shape around
                          week 8.
                        </p>
                      )}
                  </>
                )}

                <footer className="border-t border-line-soft pt-5 text-center">
                  <p className="font-mono text-[13px] tracking-[0.1em] text-mist">
                    {snapshot.season.label.toUpperCase()} ·{" "}
                    {snapshot.week.label.toUpperCase()} OF {snapshot.week.total}{" "}
                    · UPDATED {formatClock(snapshot.generatedAt, locale)}
                  </p>
                </footer>
              </div>
            )}
          </main>
        </>

        {game && GameModal && <GameModal gameId={game} onClose={closeGame} />}
      </div>
    </AccentProvider>
  );
}
