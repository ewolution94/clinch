import { useMemo } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { BroadcastBadge } from "./Broadcast";
import { AbroadBadge } from "./Marks";
import { ScheduleHow } from "./ScheduleHow";
import { SelectField } from "./SelectField";
import { Shimmer } from "./Shimmer";
import { useTeamSchedule } from "../hooks/useTeamSchedule";
import { useFavourite, useLocale, useStrings } from "../lib/useSettings";
import type { Snapshot, TeamEntry, TeamScheduleGame } from "../lib/types";

/**
 * One team's season, end to end — a view of its own, at `/team/<abbr>`.
 *
 * The week browser answers "who plays this Sunday"; this answers the other
 * question a supporter has — "when do we play, and how has it gone". It has
 * been a section at the foot of the week view and a second mode of it, and
 * both were the wrong shape: the first started 3.5 screens down a 4.8-screen
 * page, the second hid a whole view behind a switch that looked like a filter.
 * It is a tab, because it is a place you go, not a setting you flip.
 *
 * Three things give a list of seventeen near-identical rows some shape:
 *
 *  - **The strip.** A cell per week, won/lost/to-come, with the bye as a gap.
 *    The shape of a season in one glance, above the detail rather than instead
 *    of it. Nine across on a phone, all eighteen on a wide screen — a grid, not
 *    a wrap, so the second row is a clean half-season rather than a remainder.
 *  - **The next game is marked and the rest is not.** A schedule is read from
 *    "what's next" outwards, so that row gets the accent and a divider above it.
 *  - **The opponent's name fills the row.** The first version put the date and
 *    the result at opposite edges with a hole between them; a full team name
 *    reads better than the hole did.
 *
 * The column is capped: seventeen one-line rows stretched across 1800px is a
 * worse read than the same rows in a column you can follow down.
 */

function dayLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function timeLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** The season at a glance: a cell per week, the bye left as a gap. */
function SeasonStrip({
  games,
  byeWeek,
}: {
  games: TeamScheduleGame[];
  byeWeek: number | null;
}) {
  const t = useStrings();
  const weeks = useMemo(() => {
    const regular = games.filter((g) => g.seasonType === 2);
    const last = Math.max(18, ...regular.map((g) => g.week));
    return Array.from({ length: last }, (_, i) => {
      const week = i + 1;
      if (week === byeWeek) return { week, kind: "bye" as const };
      const game = regular.find((g) => g.week === week);
      if (!game) return { week, kind: "none" as const };
      return { week, kind: (game.result ?? "next") as "W" | "L" | "T" | "next" };
    });
  }, [games, byeWeek]);

  return (
    <div
      className="grid grid-cols-9 gap-1.5 sm:grid-cols-[repeat(18,minmax(0,1fr))]"
      aria-hidden="true"
      title={t.teamSchedule}
    >
      {weeks.map(({ week, kind }) => (
        <span
          key={week}
          className={clsx(
            "mono-tabular flex h-[30px] w-full items-center justify-center rounded-md text-[11px] font-semibold",
            kind === "W" && "bg-jade/22 text-jade",
            kind === "L" && "bg-live/20 text-live",
            kind === "T" && "bg-mist/20 text-fog",
            kind === "bye" && "border border-dashed border-line text-mist/70",
            kind === "next" && "border border-line bg-ink/60 text-mist",
            kind === "none" && "border border-line-soft text-mist/40",
          )}
        >
          {kind === "W" || kind === "L" || kind === "T" ? kind : week}
        </span>
      ))}
    </div>
  );
}

function ResultChip({ game }: { game: TeamScheduleGame }) {
  if (game.result === null) return null;
  const won = game.result === "W";
  const drew = game.result === "T";
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span
        className={clsx(
          "mono-tabular flex h-[20px] w-[20px] items-center justify-center rounded text-[11px] font-bold",
          won ? "bg-jade/20 text-jade" : drew ? "bg-mist/20 text-fog" : "bg-live/20 text-live",
        )}
      >
        {game.result}
      </span>
      <span className="mono-tabular w-[52px] text-right text-[12.5px] text-fog">
        {game.teamScore}–{game.opponentScore}
      </span>
    </span>
  );
}

function GameLine({
  game,
  team,
  next,
  onOpenGame,
}: {
  game: TeamScheduleGame;
  team: TeamEntry | undefined;
  next: boolean;
  onOpenGame: (id: string) => void;
}) {
  const locale = useLocale();
  const upcoming = game.result === null;
  const live = game.state === "in";

  return (
    <button
      type="button"
      onClick={() => onOpenGame(game.id)}
      data-game-id={game.id}
      style={
        next && team
          ? { borderColor: `color-mix(in srgb, ${team.accent} 55%, transparent)` }
          : undefined
      }
      className={clsx(
        "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:px-3 sm:py-3",
        live
          ? "border-live/45 bg-live/8"
          : next
            ? "bg-ink-2/60"
            : "border-line-soft bg-ink/35 hover:border-fog/30 hover:bg-ink-2/50",
      )}
    >
      <span className="mono-tabular w-[26px] shrink-0 text-[11px] text-mist">
        {game.seasonType === 3 ? "PO" : game.week}
      </span>
      <span className="w-[12px] shrink-0 text-center font-mono text-[11px] text-mist">
        {game.home ? "v" : "@"}
      </span>
      <TeamLogo abbr={game.opponent} size={21} accent={team?.accent} />
      {/* The name earns the width the first version left empty. */}
      <span className="min-w-0 flex-1 truncate font-display text-[14px] text-paper">
        <span className="@max-[22rem]/season:hidden">
          {team ? `${team.location} ${team.name}` : game.opponent}
        </span>
        <span className="mono-tabular hidden @max-[22rem]/season:inline">
          {game.opponent}
        </span>
      </span>
      {upcoming && <AbroadBadge abroad={game.abroad} compact />}
      {upcoming && <BroadcastBadge broadcast={game.broadcast} />}
      {upcoming ? (
        <span className="mono-tabular shrink-0 text-right text-[11.5px] whitespace-nowrap text-mist">
          {live
            ? game.statusDetail
            : `${dayLabel(game.kickoff, locale)} · ${timeLabel(game.kickoff, locale)}`}
        </span>
      ) : (
        <ResultChip game={game} />
      )}
    </button>
  );
}

export function TeamSeason({
  snapshot,
  teams,
  value,
  onChange,
  onOpenGame,
  onOpenSettings,
}: {
  snapshot: Snapshot;
  teams: Map<string, TeamEntry>;
  value: string | null;
  onChange: (abbr: string | null) => void;
  onOpenGame: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const t = useStrings();
  const favourite = useFavourite();
  /** Null for the live season; the year for an archived one. */
  const season = snapshot.archived ? snapshot.season.year : null;
  const { schedule, loading, error } = useTeamSchedule(value, season);

  /**
   * Grouped by division, the same way the favourite-team picker in settings
   * does it — eight short lists you can scan, rather than two of sixteen.
   */
  const groups = useMemo(
    () =>
      snapshot.conferences.flatMap((conference) =>
        conference.divisions.map((division) => ({
          id: division.id,
          label: `${conference.id} ${division.name}`,
          // Alphabetical, not by rank: the standings order moves every week, a
          // list you pick from shouldn't.
          teams: [...division.teams].sort((a, b) => a.location.localeCompare(b.location)),
        })),
      ),
    [snapshot.conferences],
  );

  /** The first game still to be played — where a reader starts. */
  const nextId = schedule?.games.find((g) => g.result === null)?.id ?? null;

  const rows = useMemo(() => {
    if (!schedule) return [];
    const out: ({ kind: "game"; game: TeamScheduleGame } | { kind: "bye"; week: number })[] =
      schedule.games.map((game) => ({ kind: "game" as const, game }));
    if (schedule.byeWeek !== null) {
      const at = out.findIndex(
        (row) =>
          row.kind === "game" && row.game.seasonType === 2 && row.game.week > schedule.byeWeek!,
      );
      const bye = { kind: "bye" as const, week: schedule.byeWeek };
      if (at < 0) out.push(bye);
      else out.splice(at, 0, bye);
    }
    return out;
  }, [schedule]);

  const team = value ? teams.get(value) : undefined;
  const record = schedule?.record ?? team?.record ?? null;

  return (
    <div className="flex flex-col gap-7 sm:gap-9">
      {/*
        A reading column. `@container/season` sits here rather than on the page,
        so the rows measure the width they actually get — which is this cap on a
        desktop and the viewport on a phone.
      */}
      <div className="@container/season mx-auto flex w-full max-w-[760px] flex-col gap-6 sm:gap-7">
        {/* The team is the heading, the way the week is the week view's. */}
        {team && (
          <header className="flex flex-col items-center gap-3 pt-1">
            <TeamLogo abbr={team.abbr} size={54} accent={team.accent} />
            <h2 className="text-center font-display text-[clamp(22px,5.5vw,32px)] leading-none font-bold tracking-[-0.02em] text-paper">
              {team.location} {team.name}
            </h2>
            <span className="mono-tabular text-[12px] tracking-[0.16em] text-mist">
              {record}
              {schedule?.byeWeek != null && (
                <>
                  {" · "}
                  {t.byeWeek} {schedule.byeWeek}
                </>
              )}
            </span>
          </header>
        )}

        {/*
          The same control panel the week view has, holding the one control this
          view has — and the same picker as settings: same frame, same type,
          same division grouping, so the app has one way of choosing a team.
        */}
        <div className="flex w-full max-w-[430px] flex-col items-center gap-3 self-center rounded-xl border border-line bg-ink/40 p-3">
          <SelectField
            aria-label={t.pickTeam}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
            wrapperClassName="w-full"
          >
            <option value="">{t.pickTeam}</option>
            {groups.map((division) => (
              <optgroup key={division.id} label={division.label}>
                {division.teams.map((entry) => (
                  <option key={entry.abbr} value={entry.abbr}>
                    {entry.location} {entry.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>

          {/*
            Why the tab opened on nothing. Only while there is no favourite —
            once there is one the view explains itself by opening on it, and a
            standing note about a setting you've already made is just noise.

            The way out is a pill on its own line, not a link inside the
            sentence: centred text wraps where it likes, and an underlined
            phrase stranded halfway through a line reads as a mistake.
          */}
          {!favourite && (
            <div className="flex flex-col items-center gap-2.5">
              <p className="max-w-[42ch] text-center font-display text-[12.5px] leading-snug text-balance text-mist">
                {t.teamFavouriteHint}
              </p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-full border border-brand/35 bg-brand/10 px-4 py-1.5 font-mono text-[11.5px] tracking-[0.12em] text-brand transition-colors hover:bg-brand/18"
              >
                {t.openSettings}
              </button>
            </div>
          )}
        </div>

        {!value && (
          <p className="max-w-[46ch] self-center px-4 py-2 text-center font-display text-[14px] leading-relaxed text-balance text-mist">
            {t.teamScheduleEmpty}
          </p>
        )}

        {loading && (
          <div className="flex flex-col gap-2">
            <Shimmer className="mb-3 h-[30px] w-full rounded-md" />
            {Array.from({ length: 8 }, (_, i) => (
              <Shimmer key={i} className="h-[46px] rounded-xl" delay={i * 60} />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-line bg-ink/40 px-4 py-5 text-center font-display text-[13px] text-mist">
            {t.teamScheduleFailed}
          </p>
        )}

        {schedule && (
          <>
            <SeasonStrip games={schedule.games} byeWeek={schedule.byeWeek} />

            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                if (row.kind === "bye") {
                  return (
                    <div
                      key="bye"
                      className="flex items-center gap-2.5 px-3 py-2 font-mono text-[10.5px] tracking-[0.16em] text-mist/70"
                    >
                      <span className="mono-tabular w-[26px] shrink-0 text-[11px]">
                        {row.week}
                      </span>
                      <span>{t.byeWeek}</span>
                      <span className="h-px flex-1 bg-line-soft" />
                    </div>
                  );
                }
                const isNext = row.game.id === nextId;
                return (
                  <div key={row.game.id} className="flex flex-col gap-2">
                    {isNext && (
                      <div className="flex items-center gap-2.5 pt-2">
                        <span className="font-mono text-[10.5px] tracking-[0.18em] text-brand">
                          {t.nextUp}
                        </span>
                        <span className="h-px flex-1 bg-brand/25" />
                      </div>
                    )}
                    <GameLine
                      game={row.game}
                      team={teams.get(row.game.opponent)}
                      next={isNext}
                      onOpenGame={onOpenGame}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Why a team plays the teams it plays — the question this view invites,
          in the same expandable block the week view ends with. */}
      <ScheduleHow />
    </div>
  );
}
