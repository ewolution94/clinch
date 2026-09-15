import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { Shimmer } from "./Shimmer";
import { useWeek, prefetchWeek } from "../hooks/useWeek";
import { currentWeek, findBySlug, relativeLabel, weekSlug } from "../lib/weeks";
import type {
  CalendarWeek,
  ScoreboardGame,
  Snapshot,
  TeamEntry,
} from "../lib/types";

interface WeekViewProps {
  snapshot: Snapshot;
  slug: string | null;
  onOpenWeek: (slug: string) => void;
  onOpenGame: (id: string) => void;
  morphCardId: string | null;
}

/** Day headings in the reader's own timezone — the whole point for a European. */
function dayKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toDateString();
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function kickoffLabel(game: ScoreboardGame): string {
  const date = new Date(game.kickoff);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function GameRow({
  game,
  teams,
  onOpenGame,
  morphCardId,
}: {
  game: ScoreboardGame;
  teams: Map<string, TeamEntry>;
  onOpenGame: (id: string) => void;
  morphCardId: string | null;
}) {
  const away = teams.get(game.away);
  const home = teams.get(game.home);
  const final = game.state === "post";
  const live = game.state === "in";
  const homeWon = final && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  // Both teams in the same division — the games that decide the race.
  const divisional =
    away &&
    home &&
    away.conference === home.conference &&
    away.division === home.division;

  /**
   * Teams stack rather than sitting side by side. Two names across a 358px card
   * clipped "Buccaneers" and "Commanders"; stacked, each gets the full width,
   * and it matches how every scoreboard is read — away on top, home below.
   */
  const side = (
    abbr: string,
    team: TeamEntry | undefined,
    score: number | null,
    won: boolean,
    home: boolean,
  ) => (
    <span className="flex items-center gap-2.5">
      <span className="w-3 shrink-0 text-center font-mono text-[12px] text-mist">
        {home ? "@" : ""}
      </span>
      <TeamLogo abbr={abbr} size={30} accent={team?.accent} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span
          className={clsx(
            "truncate font-display text-[15.5px] font-bold",
            final && !won ? "text-mist" : "text-paper",
          )}
        >
          {team ? `${team.location} ${team.name}` : abbr}
        </span>
        <span className="mono-tabular text-[12px] text-mist">
          {team?.record ? `${abbr} · ${team.record}` : abbr}
        </span>
      </span>
      {(final || live) && (
        <span
          className={clsx(
            "mono-tabular shrink-0 text-[18.5px] font-bold",
            final && !won ? "text-mist" : "text-paper",
          )}
        >
          {score ?? 0}
        </span>
      )}
    </span>
  );

  return (
    <button
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
        "flex w-full flex-col gap-2 rounded-xl border bg-ink/55 p-3 text-left transition-colors hover:border-fog/35 hover:bg-ink-2/70",
        live ? "border-live/40" : "border-line",
      )}
    >
      <div className="flex flex-col gap-2">
        {side(game.away, away, game.awayScore, awayWon, false)}
        {side(game.home, home, game.homeScore, homeWon, true)}
      </div>

      <div className="flex items-center gap-2 border-t border-line-soft pt-2">
        {live && (
          <span className="animate-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live text-live" />
        )}
        <span
          className={clsx(
            "mono-tabular text-[12px] tracking-wide",
            live ? "text-live" : "text-mist",
          )}
        >
          {game.state === "pre"
            ? kickoffLabel(game)
            : game.statusDetail || "Final"}
        </span>
        {divisional && (
          <span className="rounded border border-brand/25 bg-brand/10 px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.1em] text-brand">
            DIVISION
          </span>
        )}
      </div>
    </button>
  );
}

function WeekSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading week"
    >
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Shimmer className="h-3 w-40 rounded" delay={group * 80} />
          {[0, 1, 2].map((i) => (
            <Shimmer
              key={i}
              className="h-[92px] w-full rounded-xl"
              delay={group * 80 + i * 70}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WeekView({
  snapshot,
  slug,
  onOpenWeek,
  onOpenGame,
  morphCardId,
}: WeekViewProps) {
  const calendar = snapshot.calendar;
  const now = useMemo(
    () => currentWeek(calendar, snapshot.week.number, snapshot.season.type),
    [calendar, snapshot.week.number, snapshot.season.type],
  );
  const selected = findBySlug(calendar, slug) ?? now ?? calendar[0] ?? null;
  const index = selected
    ? calendar.findIndex((e) => weekSlug(e) === weekSlug(selected))
    : -1;
  const previous = index > 0 ? calendar[index - 1] : null;
  const next =
    index >= 0 && index < calendar.length - 1 ? calendar[index + 1] : null;

  const { view, loading } = useWeek(
    selected?.seasonType ?? 2,
    selected?.week ?? 1,
  );

  // Which way the last move went, so the incoming week enters from that side.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const go = useCallback(
    (target: CalendarWeek | null, way: "forward" | "back") => {
      if (!target) return;
      setDirection(way);
      onOpenWeek(weekSlug(target));
    },
    [onOpenWeek],
  );

  // Warm the neighbours so the arrows land instantly.
  useEffect(() => {
    if (previous) prefetchWeek(previous.seasonType, previous.week);
    if (next) prefetchWeek(next.seasonType, next.week);
  }, [previous, next]);

  // ← / → step through the season.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") go(previous, "back");
      if (event.key === "ArrowRight") go(next, "forward");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previous, next, go]);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Must be clearly horizontal, and long enough to be deliberate.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) go(next, "forward");
    else go(previous, "back");
  };

  const teams = useMemo(() => {
    const map = new Map<string, TeamEntry>();
    for (const conference of snapshot.conferences) {
      for (const team of conference.seeds) map.set(team.abbr, team);
    }
    return map;
  }, [snapshot.conferences]);

  const days = useMemo(() => {
    const groups = new Map<string, ScoreboardGame[]>();
    for (const game of view?.games ?? []) {
      const key = dayKey(game.kickoff);
      groups.set(key, [...(groups.get(key) ?? []), game]);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      const ta = Date.parse(a);
      const tb = Date.parse(b);
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return ta - tb;
    });
  }, [view]);

  if (!selected) return null;
  const relative = now ? relativeLabel(calendar, selected, now) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <WeekArrow
            direction="prev"
            target={previous}
            onSelect={() => go(previous, "back")}
            onHover={prefetchWeek}
          />
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <h2 className="font-display text-[clamp(24px,6vw,34px)] leading-none font-bold tracking-[-0.02em] text-paper">
              {selected.label}
            </h2>
            <span className="mt-1.5 font-mono text-[11.5px] tracking-[0.14em] text-mist">
              {relative ? relative.toUpperCase() : "THIS WEEK"}
            </span>
          </div>
          <WeekArrow
            direction="next"
            target={next}
            onSelect={() => go(next, "forward")}
            onHover={prefetchWeek}
          />
        </div>

        {relative && now && (
          <button
            type="button"
            onClick={() => onOpenWeek(weekSlug(now))}
            className="self-center rounded-full border border-brand/35 bg-brand/10 px-3.5 py-1.5 font-mono text-[11.5px] tracking-[0.12em] text-brand transition-colors hover:bg-brand/18"
          >
            BACK TO THIS WEEK
          </button>
        )}

        {/* The standings never move with the week, so say so once, quietly. */}
        <p className="text-center font-display text-[12.5px] text-mist">
          Schedule and results only — the standings and bracket always show
          where the season stands today.
        </p>
      </header>

      {loading && !view ? (
        <WeekSkeleton />
      ) : (
        <div
          key={weekSlug(selected)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
          className={clsx(
            "flex flex-col gap-5",
            direction === "forward"
              ? "animate-week-forward"
              : "animate-week-back",
          )}
        >
          {days.map(([key, games]) => (
            <section key={key} className="flex flex-col gap-2">
              <h3 className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
                {dayLabel(games[0].kickoff)}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((game) => (
                  <GameRow
                    key={game.id}
                    game={game}
                    teams={teams}
                    onOpenGame={onOpenGame}
                    morphCardId={morphCardId}
                  />
                ))}
              </div>
            </section>
          ))}

          {view && view.games.length === 0 && (
            <p className="rounded-xl border border-line bg-ink/40 px-4 py-6 text-center font-display text-[13px] text-mist">
              No games scheduled yet for {selected.label}.
            </p>
          )}

          {view && view.byeTeams.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
                On bye
              </h3>
              <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-ink/40 p-3">
                {view.byeTeams.map((abbr) => (
                  <span
                    key={abbr}
                    className="flex items-center gap-2 rounded-lg border border-line-soft bg-abyss-2/60 px-2.5 py-1.5"
                  >
                    <TeamLogo
                      abbr={abbr}
                      size={20}
                      accent={teams.get(abbr)?.accent}
                    />
                    <span className="mono-tabular text-[12.5px] text-fog">
                      {abbr}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function WeekArrow({
  direction,
  target,
  onSelect,
  onHover,
}: {
  direction: "prev" | "next";
  target: CalendarWeek | null;
  onSelect: () => void;
  onHover: (seasonType: number, week: number) => void;
}) {
  return (
    <button
      type="button"
      disabled={!target}
      onClick={onSelect}
      onPointerEnter={() => target && onHover(target.seasonType, target.week)}
      aria-label={
        target
          ? `Go to ${target.label}`
          : direction === "prev"
            ? "No earlier week"
            : "No later week"
      }
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-fog/25 bg-ink-2 font-mono text-[22px] leading-none font-bold text-paper shadow-lg shadow-abyss/50 transition-colors hover:border-brand/60 hover:bg-brand/15 hover:text-brand disabled:cursor-default disabled:border-line disabled:bg-ink/40 disabled:text-mist disabled:opacity-40 disabled:shadow-none"
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
