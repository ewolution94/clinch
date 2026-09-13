import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
    return wide ? snapshot.conferences : snapshot.conferences.filter((c) => c.id === conference);
  }, [snapshot, wide, conference]);

  useEffect(() => {
    const view = route === "playoffs" ? "Playoff picture" : route === "bracket" ? "Bracket" : "Standings";
    document.title = snapshot ? `${view} · ${snapshot.week.label} — Clinch` : "Clinch";
  }, [snapshot, route]);

  // A shared-element morph from the clicked card into the dialog, where the
  // browser supports it; a plain open where it doesn't.
  const onOpenGame = useCallback(
    (id: string) => {
      document.startViewTransition ? document.startViewTransition(() => openGame(id)) : openGame(id);
    },
    [openGame]
  );

  return (
    <div className="min-h-screen">
      <FieldBackdrop />

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
                Showing the last good data — the league feed didn&apos;t answer on the most recent refresh.
              </p>
            )}

            {route === "standings" ? (
              <>
                <SeasonHero snapshot={snapshot} />
                <WeekGames games={snapshot.games} label={snapshot.week.label} onOpenGame={onOpenGame} />
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6">
                  {conferences.map((c) => (
                    <ConferenceStandings key={c.id} conference={c} />
                  ))}
                </div>
                <Legend />
              </>
            ) : route === "bracket" ? (
              <BracketTree snapshot={snapshot} onOpenGame={onOpenGame} />
            ) : (
              <>
                {snapshot.season.type === 2 && snapshot.week.number <= 4 && (
                  <p className="rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 font-display text-[12px] leading-relaxed text-mist">
                    It&apos;s {snapshot.week.label.toLowerCase()} of {snapshot.week.total} — nearly every team is still
                    within a game of the cut, so the seeding below moves a lot each Sunday. It starts holding its shape
                    around week 8.
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
                {snapshot.season.label.toUpperCase()} · {snapshot.week.label.toUpperCase()} OF{" "}
                {snapshot.week.total} · UPDATED {formatClock(snapshot.generatedAt)}
              </p>
            </footer>
          </div>
        )}
      </main>

      {game && (
        <Suspense fallback={null}>
          <GameModal gameId={game} onClose={closeGame} />
        </Suspense>
      )}
    </div>
  );
}
