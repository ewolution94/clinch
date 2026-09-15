import { memo, useRef } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { edgeFadeMask, useOverflowEdges } from "../hooks/useOverflowEdges";
import { formatKickoff } from "../lib/format";
import type { ScoreboardGame, TeamEntry } from "../lib/types";

interface WeekGamesProps {
  games: ScoreboardGame[];
  /** Joined by abbreviation, only so the marks can carry their team's colour. */
  teams: Map<string, TeamEntry>;
  label: string;
  onOpenGame: (id: string) => void;
  /**
   * The single card allowed to carry a `view-transition-name` right now. A name
   * lifts its element into the transition layer, above everything — so naming
   * every card would float all of them over the opening modal.
   */
  morphCardId: string | null;
}

function Side({
  abbr,
  accent,
  score,
  dim,
}: {
  abbr: string;
  accent: string | undefined;
  score: number | null;
  dim: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <TeamLogo abbr={abbr} size={18} accent={accent} />
      <span
        className={clsx(
          "mono-tabular text-[14px] font-semibold",
          dim ? "text-mist" : "text-paper",
        )}
      >
        {abbr}
      </span>
      <span
        className={clsx(
          "mono-tabular ml-auto text-[14.5px]",
          dim ? "text-mist" : "text-paper",
        )}
      >
        {score ?? "–"}
      </span>
    </div>
  );
}

export const WeekGames = memo(function WeekGames({
  games,
  teams,
  label,
  onOpenGame,
  morphCardId,
}: WeekGamesProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useOverflowEdges(scroller);
  const mask = edgeFadeMask(edges);

  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-mono text-[13px] tracking-[0.18em] text-mist">
          {label.toUpperCase()}
        </h3>
        <span className="font-mono text-[12px] tracking-[0.12em] text-mist opacity-70">
          {games.length} GAMES
        </span>
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
            const homeWon =
              final && (game.homeScore ?? 0) > (game.awayScore ?? 0);
            const awayWon =
              final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onOpenGame(game.id)}
                data-game-id={game.id}
                aria-label={`${game.away} at ${game.home} — game detail`}
                style={
                  game.id === morphCardId
                    ? { viewTransitionName: `game-${game.id}` }
                    : undefined
                }
                className={clsx(
                  "flex w-[148px] shrink-0 flex-col gap-1.5 rounded-xl border bg-ink/55 p-2.5 text-left transition-colors hover:border-fog/35 hover:bg-ink-2/70 sm:w-auto",
                  game.state === "in" ? "border-live/40" : "border-line",
                )}
              >
                <Side
                  abbr={game.away}
                  accent={teams.get(game.away)?.accent}
                  score={game.awayScore}
                  dim={final && !awayWon}
                />
                <Side
                  abbr={game.home}
                  accent={teams.get(game.home)?.accent}
                  score={game.homeScore}
                  dim={final && !homeWon}
                />
                <div className="flex items-center gap-1.5 border-t border-line-soft pt-1.5">
                  {game.state === "in" && (
                    <span className="animate-live-dot h-1 w-1 rounded-full bg-live text-live" />
                  )}
                  <span
                    className={clsx(
                      "mono-tabular truncate text-[12px] tracking-wide",
                      game.state === "in" ? "text-live" : "text-mist",
                    )}
                  >
                    {game.state === "pre"
                      ? formatKickoff(game.kickoff)
                      : game.statusDetail || (final ? "Final" : "")}
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
