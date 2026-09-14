import { memo, useRef } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { edgeFadeMask, useOverflowEdges } from "../hooks/useOverflowEdges";
import { formatKickoff } from "../lib/format";
import type { ScoreboardGame } from "../lib/types";

interface WeekGamesProps {
  games: ScoreboardGame[];
  label: string;
  onOpenGame: (id: string) => void;
  /** The game currently in the modal, which owns the shared transition name. */
  openGameId: string | null;
}

function Side({ abbr, score, dim }: { abbr: string; score: number | null; dim: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <TeamLogo abbr={abbr} size={18} />
      <span className={clsx("mono-tabular text-[11px] font-semibold", dim ? "text-mist" : "text-paper")}>{abbr}</span>
      <span className={clsx("mono-tabular ml-auto text-[12px]", dim ? "text-mist" : "text-paper")}>
        {score ?? "–"}
      </span>
    </div>
  );
}

export const WeekGames = memo(function WeekGames({ games, label, onOpenGame, openGameId }: WeekGamesProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useOverflowEdges(scroller);
  const mask = edgeFadeMask(edges);

  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-mono text-[10px] tracking-[0.18em] text-mist">{label.toUpperCase()}</h3>
        <span className="font-mono text-[9px] tracking-[0.12em] text-mist opacity-70">{games.length} GAMES</span>
      </div>

      {/* Scrolls sideways on a phone, wraps into a grid once there's room. The
          fade is applied per-edge from the live scroll position, so the wrapped
          grid — which never overflows — is left alone entirely. */}
      <div
        ref={scroller}
        className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        <div className="flex gap-2 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {games.map((game) => {
            const final = game.state === "post";
            const homeWon = final && (game.homeScore ?? 0) > (game.awayScore ?? 0);
            const awayWon = final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onOpenGame(game.id)}
                data-game-id={game.id}
                aria-label={`${game.away} at ${game.home} — game detail`}
                style={game.id === openGameId ? undefined : { viewTransitionName: `game-${game.id}` }}
                className={clsx(
                  "flex w-[148px] shrink-0 flex-col gap-1.5 rounded-xl border bg-ink/55 p-2.5 text-left transition-colors hover:border-fog/35 hover:bg-ink-2/70 sm:w-auto",
                  game.state === "in" ? "border-live/40" : "border-line"
                )}
              >
                <Side abbr={game.away} score={game.awayScore} dim={final && !awayWon} />
                <Side abbr={game.home} score={game.homeScore} dim={final && !homeWon} />
                <div className="flex items-center gap-1.5 border-t border-line-soft pt-1.5">
                  {game.state === "in" && <span className="animate-live-dot h-1 w-1 rounded-full bg-live text-live" />}
                  <span
                    className={clsx(
                      "mono-tabular truncate text-[9px] tracking-wide",
                      game.state === "in" ? "text-live" : "text-mist"
                    )}
                  >
                    {game.state === "pre" ? formatKickoff(game.kickoff) : game.statusDetail || (final ? "Final" : "")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
});
