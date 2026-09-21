import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
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
import { SettingsDialog } from "./components/SettingsDialog";
import { SeasonHero } from "./components/SeasonHero";
import { Legend } from "./components/Legend";
import { Skeleton } from "./components/Skeleton";
import { ConferenceSwitch } from "./components/ConferenceSwitch";
import { WeekView } from "./components/WeekView";

// Kept out of the main bundle: most visits never open a game.
const GameModal = lazy(() => import("./components/GameModal"));
import { useSnapshot } from "./hooks/useSnapshot";
import { useRoute, type Route } from "./hooks/useRoute";
import { DESKTOP_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
import { formatClock } from "./lib/format";
import type { ConferenceId } from "./lib/types";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const { route, navigate, game, openGame, closeGame, weekSlug, openWeek } =
    useRoute();
  const [conference, setConference] = useState<ConferenceId>("AFC");
  /** The one game whose card is mid-morph, if any. */
  const [morphing, setMorphing] = useState<string | null>(null);
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
      if (settings.landing === "last") update({ lastRoute: next });
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
            : "Standings";
    document.title = snapshot
      ? `${view} · ${snapshot.week.label} — Clinch`
      : "Clinch";
  }, [snapshot, route]);

  // The morph needs the modal's chunk already parsed, or the browser captures a
  // Suspense fallback instead of the dialog. Warm it once the page is idle.
  useEffect(() => {
    const warm = () => void import("./components/GameModal");
    const idle = window.requestIdleCallback?.(warm);
    if (idle === undefined) {
      const timer = setTimeout(warm, 1500);
      return () => clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, []);

  /**
   * A shared-element morph from the clicked card into the dialog.
   *
   * `flushSync` is load-bearing: `startViewTransition` snapshots the DOM as soon
   * as its callback returns, and React would otherwise still be holding the
   * update. Without it the browser captures the *old* DOM twice and nothing
   * animates.
   */
  /**
   * Runs `update` inside a view transition, with exactly one card wearing the
   * shared name for the duration.
   *
   * A `view-transition-name` is not a label — it lifts the element out of the
   * page into the transition layer, which paints above everything. Leaving one
   * on all sixteen cards meant sixteen floating groups over the opening modal:
   * the reported bug. So the name is granted to the single card being morphed,
   * immediately before the snapshot, and surrendered when the transition ends.
   */
  const morph = useCallback((id: string, update: () => void) => {
    if (!document.startViewTransition) {
      update();
      return;
    }
    flushSync(() => setMorphing(id));
    const transition = document.startViewTransition(() => flushSync(update));
    void transition.finished.finally(() => setMorphing(null));
  }, []);

  const onOpenGame = useCallback(
    async (id: string) => {
      // Resolve the modal's chunk *first*. If it is still pending, the render
      // inside the transition produces the Suspense fallback, the browser
      // captures no panel, and there is nothing for the card to morph into.
      await import("./components/GameModal");
      morph(id, () => openGame(id));
    },
    [morph, openGame],
  );

  const onCloseGame = useCallback(() => {
    if (game) morph(game, closeGame);
    else closeGame();
  }, [morph, game, closeGame]);

  // The card holds the shared name only until the panel takes it over.
  const morphCardId = morphing !== null && morphing !== game ? morphing : null;

  return (
    <AccentProvider snapshot={snapshot}>
      <div className="min-h-screen">
        <FieldBackdrop />

        {/* Holds focus and the accessibility tree outside the modal — the job
          showModal() used to do before the top layer broke the morph. */}
        <div id="app-shell" inert={game !== null ? true : undefined}>
          <Header
            snapshot={snapshot}
            connection={connection}
            route={route}
            onRoute={onRoute}
            onOpenSettings={openSettings}
          />

          <main className="mx-auto max-w-[1800px] px-4 pt-5 pb-16 sm:px-6 lg:px-10">
            {!snapshot ? (
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
                      morphCardId={morphCardId}
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
                    morphCardId={morphCardId}
                  />
                ) : route === "bracket" ? (
                  <BracketTree
                    snapshot={snapshot}
                    onOpenGame={onOpenGame}
                    morphCardId={morphCardId}
                  />
                ) : (
                  <>
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
        </div>

        {game && (
          <Suspense fallback={null}>
            <GameModal gameId={game} onClose={onCloseGame} />
          </Suspense>
        )}

        <SettingsDialog
          open={settingsOpen}
          onClose={closeSettings}
        />
      </div>
    </AccentProvider>
  );
}
