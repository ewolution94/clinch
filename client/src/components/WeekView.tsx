import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { Shimmer } from "./Shimmer";
import { BroadcastBadge, BroadcastBand } from "./Broadcast";
import { AbroadBadge, FavouriteStar } from "./Marks";
import { useWeek, prefetchWeek } from "../hooks/useWeek";
import { currentWeek, findBySlug, relativeLabel, weekSlug } from "../lib/weeks";
import { teamMap } from "../lib/teams";
import { useLocale, useSettings, useStrings } from "../lib/useSettings";
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
}

/** Day headings in the reader's own timezone — the whole point for a European. */
function dayKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toDateString();
}

function dayLabel(iso: string, locale: string, tbd: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return tbd;
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function kickoffLabel(game: ScoreboardGame, locale: string): string {
  const date = new Date(game.kickoff);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** On a channel the reader has, or in a slot it might yet take. */
function onTv(game: ScoreboardGame): boolean {
  const status = game.broadcast?.status;
  return status === "confirmed" || status === "candidate";
}

function GameRow({
  game,
  teams,
  favourite,
  onOpenGame,
}: {
  game: ScoreboardGame;
  teams: Map<string, TeamEntry>;
  favourite: string | null;
  onOpenGame: (id: string) => void;
}) {
  const locale = useLocale();
  const away = teams.get(game.away);
  const home = teams.get(game.home);
  const final = game.state === "post";
  const live = game.state === "in";
  const homeWon = final && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
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
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={clsx(
              "truncate font-display text-[15.5px] font-bold",
              final && !won ? "text-mist" : "text-paper",
            )}
          >
            {team ? `${team.location} ${team.name}` : abbr}
          </span>
          {abbr === favourite && <FavouriteStar accent={team?.accent} />}
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

  // A live game keeps its red edge; the team tint is for every other state.
  const mineAccent =
    !live && (game.home === favourite || game.away === favourite)
      ? teams.get(favourite!)?.accent
      : undefined;

  return (
    <button
      type="button"
      onClick={() => onOpenGame(game.id)}
      data-game-id={game.id}
      aria-label={`${game.away} at ${game.home} — game detail`}
      style={
        mineAccent
          ? {
              borderColor: `color-mix(in srgb, ${mineAccent} 55%, transparent)`,
            }
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
            "mono-tabular shrink-0 text-[12px] tracking-wide",
            live ? "text-live" : "text-mist",
          )}
        >
          {game.state === "pre"
            ? kickoffLabel(game, locale)
            : game.statusDetail || "Final"}
        </span>
        <AbroadBadge abroad={game.abroad} />
        <BroadcastBadge broadcast={game.broadcast} />
      </div>
    </button>
  );
}

function WeekSkeleton() {
  const t = useStrings();
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label={t.loadingWeek}
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
}: WeekViewProps) {
  const locale = useLocale();
  const t = useStrings();
  const calendar = snapshot.calendar;
  /** Null for the live season; the year for an archived one. */
  const season = snapshot.archived ? snapshot.season.year : null;
  // A finished season has no "this week" to be ahead of or behind, so it gets
  // no relative label and no way back to one.
  const now = useMemo(
    () =>
      snapshot.archived
        ? null
        : currentWeek(calendar, snapshot.week.number, snapshot.season.type),
    [calendar, snapshot.week.number, snapshot.season.type, snapshot.archived],
  );
  /*
   * Where a season opens when no week is named. The live one opens on the week
   * being played; a finished one opens on its *last* week — the Super Bowl —
   * because that is where the season arrived, and week 1 of 2023 is an
   * arbitrary place to be put down in a season whose ending is the point.
   */
  const fallback = snapshot.archived ? calendar[calendar.length - 1] : calendar[0];
  const selected = findBySlug(calendar, slug) ?? now ?? fallback ?? null;
  const index = selected
    ? calendar.findIndex((e) => weekSlug(e) === weekSlug(selected))
    : -1;
  const previous = index > 0 ? calendar[index - 1] : null;
  const next =
    index >= 0 && index < calendar.length - 1 ? calendar[index + 1] : null;

  const { view, loading } = useWeek(
    selected?.seasonType ?? 2,
    selected?.week ?? 1,
    season,
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
    if (previous) prefetchWeek(previous.seasonType, previous.week, season);
    if (next) prefetchWeek(next.seasonType, next.week, season);
  }, [previous, next, season]);

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

  const warm = useCallback(
    (seasonType: number, week: number) => prefetchWeek(seasonType, week, season),
    [season],
  );

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

  const teams = useMemo(() => teamMap(snapshot), [snapshot]);

  const { settings, update } = useSettings();
  const { favourite } = settings;
  const broadcasts = view?.broadcasts;
  // Only a week whose listings are out has anything to filter by; elsewhere the
  // remembered choice sits idle rather than emptying the page.
  const filterable =
    !!broadcasts && broadcasts.published && broadcasts.upcoming > 0;
  const tvOnly = settings.tvOnly && filterable;

  // The reader's game leads the week, whatever the filter says about the rest.
  const pinned = useMemo(
    () =>
      favourite
        ? (view?.games.find(
            (g) => g.home === favourite || g.away === favourite,
          ) ?? null)
        : null,
    [view, favourite],
  );
  const favouriteOnBye = !!favourite && !!view?.byeTeams.includes(favourite);

  const days = useMemo(() => {
    const groups = new Map<string, ScoreboardGame[]>();
    for (const game of view?.games ?? []) {
      // Pinned above instead. One card per game, never two: a second would
      // share its view-transition-name, and the morph silently skips.
      if (game.id === pinned?.id) continue;
      if (tvOnly && !onTv(game)) continue;
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
  }, [view, pinned, tvOnly]);

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
            onHover={warm}
          />
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <h2 className="font-display text-[clamp(24px,6vw,34px)] leading-none font-bold tracking-[-0.02em] text-paper">
              {selected.label}
            </h2>
            <span className="mt-1.5 font-mono text-[11.5px] tracking-[0.14em] text-mist">
              {snapshot.archived
                ? String(snapshot.season.year)
                : relative
                  ? relative.toUpperCase()
                  : "THIS WEEK"}
            </span>
          </div>
          <WeekArrow
            direction="next"
            target={next}
            onSelect={() => go(next, "forward")}
            onHover={warm}
          />
        </div>

        {relative && now && (
          <button
            type="button"
            onClick={() => onOpenWeek(weekSlug(now))}
            className="self-center rounded-full border border-brand/35 bg-brand/10 px-3.5 py-1.5 font-mono text-[11.5px] tracking-[0.12em] text-brand transition-colors hover:bg-brand/18"
          >
            {t.backToThisWeek}
          </button>
        )}

        {/* The standings never move with the week, so say so once, quietly. */}
        <p className="text-center font-display text-[12.5px] text-mist">
          {t.scheduleOnly}
        </p>

        <BroadcastBand
          broadcasts={broadcasts}
          filter={
            filterable
              ? { on: tvOnly, set: (on) => update({ tvOnly: on }) }
              : undefined
          }
        />
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
          {favourite && (pinned || favouriteOnBye) && (
            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
                {t.yourTeam}
                {pinned && ` · ${dayLabel(pinned.kickoff, locale, t.dateTbd)}`}
              </h3>
              {pinned ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <GameRow
                    game={pinned}
                    teams={teams}
                    favourite={favourite}
                    onOpenGame={onOpenGame}
                  />
                </div>
              ) : (
                <ByeNote abbr={favourite} team={teams.get(favourite)} />
              )}
            </section>
          )}

          {tvOnly && days.length === 0 && broadcasts && (
            <p className="rounded-xl border border-line bg-ink/40 px-4 py-6 text-center font-display text-[13px] text-mist">
              {t.noneOnTv.replace(
                "{where}",
                broadcasts.outlets.join(` ${t.or} `),
              )}
            </p>
          )}

          {days.map(([key, games]) => (
            <section key={key} className="flex flex-col gap-2">
              <h3 className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
                {dayLabel(games[0].kickoff, locale, t.dateTbd)}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((game) => (
                  <GameRow
                    key={game.id}
                    game={game}
                    teams={teams}
                    favourite={favourite}
                    onOpenGame={onOpenGame}
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

          {view && view.byeTeams.length > 0 && !tvOnly && (
            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
                {t.onBye}
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

/** The reader's team has the week off — worth a line, not an empty section. */
function ByeNote({
  abbr,
  team,
}: {
  abbr: string;
  team: TeamEntry | undefined;
}) {
  const t = useStrings();
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border bg-ink/40 px-3 py-2.5"
      style={{
        borderColor: team
          ? `color-mix(in srgb, ${team.accent} 55%, transparent)`
          : undefined,
      }}
    >
      <TeamLogo abbr={abbr} size={26} accent={team?.accent} />
      <span className="min-w-0 truncate font-display text-[15.5px] font-bold text-paper">
        {team ? `${team.location} ${team.name}` : abbr}
      </span>
      <FavouriteStar accent={team?.accent} />
      <span className="ml-auto shrink-0 font-mono text-[12px] tracking-[0.08em] text-mist">
        {t.onByeThisWeek}
      </span>
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
  const t = useStrings();
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
            ? t.noEarlierWeek
            : t.noLaterWeek
      }
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-fog/25 bg-ink-2 font-mono text-[22px] leading-none font-bold text-paper shadow-lg shadow-abyss/50 transition-colors hover:border-brand/60 hover:bg-brand/15 hover:text-brand disabled:cursor-default disabled:border-line disabled:bg-ink/40 disabled:text-mist disabled:opacity-40 disabled:shadow-none"
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
