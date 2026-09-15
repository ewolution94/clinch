import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { FieldBackdrop } from "./components/FieldBackdrop";
import { Header } from "./components/Header";
import { ConferenceStandings } from "./components/ConferenceStandings";
import { PlayoffColumn } from "./components/PlayoffColumn";
import { BracketTree } from "./components/BracketTree";
import { WeekGames } from "./components/WeekGames";
import { SeasonHero } from "./components/SeasonHero";
import { Legend } from "./components/Legend";
import { Skeleton } from "./components/Skeleton";

// Kept out of the main bundle: most visits never open a game.
const GameModal = lazy(() => import("./components/GameModal"));
import { useSnapshot } from "./hooks/useSnapshot";
import { useRoute } from "./hooks/useRoute";
import { DESKTOP_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
import { formatClock } from "./lib/format";
import type { ConferenceId } from "./lib/types";

export default function App() {
  const { snapshot, connection } = useSnapshot();
  const { route, navigate, game, openGame, closeGame } = useRoute();
  const [conference, setConference] = useState<ConferenceId>("AFC");
  const wide = useMediaQuery(DESKTOP_QUERY);

  const conferences = useMemo(() => {
    if (!snapshot) return [];
    return wide
      ? snapshot.conferences
      : snapshot.conferences.filter((c) => c.id === conference);
  }, [snapshot, wide, conference]);

  useEffect(() => {
    const view =
      route === "playoffs"
        ? "Playoff picture"
        : route === "bracket"
          ? "Bracket"
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
  const withTransition = useCallback((update: () => void) => {
    if (!document.startViewTransition) {
      update();
      return;
    }
    document.startViewTransition(() => flushSync(update));
  }, []);

  const onOpenGame = useCallback(
    async (id: string) => {
      // Resolve the modal's chunk *first*. If it is still pending, the render
      // inside the transition produces the Suspense fallback, the browser
      // captures no panel, and there is nothing for the card to morph into.
      await import("./components/GameModal");
      withTransition(() => openGame(id));
    },
    [withTransition, openGame],
  );
  const onCloseGame = useCallback(
    () => withTransition(closeGame),
    [withTransition, closeGame],
  );

  return (
    <div className="min-h-screen">
      <FieldBackdrop />

      {/* Holds focus and the accessibility tree outside the modal — the job
          showModal() used to do before the top layer broke the morph. */}
      <div inert={game !== null ? true : undefined}>
        <Header
          snapshot={snapshot}
          connection={connection}
          route={route}
          onRoute={navigate}
          conference={conference}
          onConference={setConference}
          showConferenceSwitch={!wide && route !== "bracket"}
        />

        <main className="mx-auto max-w-[1800px] px-4 pt-5 pb-16 sm:px-6 lg:px-10">
          {!snapshot ? (
            <Skeleton connection={connection} />
          ) : (
            <div className="flex flex-col gap-6">
              {snapshot.stale && (
                <p className="rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2 font-mono text-[11px] text-gold">
                  Showing the last good data — the league feed didn&apos;t
                  answer on the most recent refresh.
                </p>
              )}

              {route === "standings" ? (
                <>
                  <SeasonHero snapshot={snapshot} />
                  <WeekGames
                    games={snapshot.games}
                    label={snapshot.week.label}
                    onOpenGame={onOpenGame}
                    openGameId={game}
                  />
                  <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6">
                    {conferences.map((c) => (
                      <ConferenceStandings key={c.id} conference={c} />
                    ))}
                  </div>
                  <Legend />
                </>
              ) : route === "bracket" ? (
                <BracketTree
                  snapshot={snapshot}
                  onOpenGame={onOpenGame}
                  openGameId={game}
                />
              ) : (
                <>
                  {snapshot.season.type === 2 && snapshot.week.number <= 4 && (
                    <p className="rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 font-display text-[12px] leading-relaxed text-mist">
                      It&apos;s {snapshot.week.label.toLowerCase()} of{" "}
                      {snapshot.week.total} — nearly every team is still within
                      a game of the cut, so the seeding below moves a lot each
                      Sunday. It starts holding its shape around week 8.
                    </p>
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
                <p className="font-mono text-[10px] tracking-[0.1em] text-mist">
                  {snapshot.season.label.toUpperCase()} ·{" "}
                  {snapshot.week.label.toUpperCase()} OF {snapshot.week.total} ·
                  UPDATED {formatClock(snapshot.generatedAt)}
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
    </div>
  );
}
