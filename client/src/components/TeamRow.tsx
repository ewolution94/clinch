import { memo, useState } from "react";
import { TeamLogo } from "./TeamLogo";
import { FormDots } from "./FormDots";
import { RESULT_COLOR, STATUS_META } from "../lib/status";
import {
  formatDiff,
  formatGames,
  formatKickoff,
  formatPct,
} from "../lib/format";
import { useLocale, useStrings } from "../lib/useSettings";
import type { TeamEntry } from "../lib/types";

interface TeamRowProps {
  team: TeamEntry;
  /** Draws the line between the 4th and 5th team of a division. */
  showRank?: boolean;
}

function ResultPill({ result }: { result: "W" | "L" | "T" }) {
  const color = RESULT_COLOR[result];
  return (
    <span
      className="mono-tabular flex h-4 w-4 items-center justify-center rounded text-[12px] font-bold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {result}
    </span>
  );
}

export const TeamRow = memo(function TeamRow({
  team,
  showRank = true,
}: TeamRowProps) {
  const locale = useLocale();
  const t = useStrings();
  const [open, setOpen] = useState(false);
  const status = STATUS_META[team.status];

  return (
    <div
      className="relative border-t border-line-soft first:border-t-0"
      style={
        open
          ? { background: `color-mix(in srgb, ${team.accent} 6%, transparent)` }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group relative flex w-full items-center gap-2.5 px-3 py-3 text-left @xl/card:gap-3.5 @xl/card:px-4"
      >
        {/* Team colour edge — the only place each team's brand is asserted at
            full strength, so 16 rows stay scannable rather than a rainbow. */}
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full transition-all group-hover:top-0 group-hover:bottom-0 group-hover:w-[4px]"
          style={{
            background: team.accent,
            opacity: status.inField ? 0.95 : 0.3,
          }}
        />
        {/* …and a wash of it that only appears under the cursor. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, ${team.accent} 16%, transparent) 0%, transparent 55%)`,
          }}
        />

        {showRank && (
          <span
            className="mono-tabular relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[13px] font-bold"
            style={
              team.divisionRank === 1
                ? {
                    color: team.accent,
                    background: `color-mix(in srgb, ${team.accent} 16%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${team.accent} 32%, transparent)`,
                  }
                : { color: "var(--color-mist)" }
            }
          >
            {team.divisionRank}
          </span>
        )}

        <span className="relative transition-transform duration-200 group-hover:scale-110">
          <TeamLogo abbr={team.abbr} size={30} accent={team.accent} />
        </span>

        <span className="relative flex min-w-0 flex-1 items-baseline gap-2">
          <span className="mono-tabular shrink-0 text-[15.5px] font-bold tracking-tight text-paper">
            {team.abbr}
          </span>
          {/* On a phone the logo and abbreviation already name the team, and
              every data column is worth more than a half-truncated nickname. */}
          <span className="hidden truncate font-display text-[15.5px] text-fog @sm/card:inline">
            <span className="hidden @lg/card:inline">{team.location} </span>
            {team.name}
          </span>
        </span>

        {/* Win percentage is redundant next to a 17-game record, so it lives in
            the drawer; these two only appear once the card is genuinely wide. */}
        <span className="mono-tabular relative hidden w-14 shrink-0 text-right text-[14.5px] text-mist @xl/card:block">
          {team.conferenceRecord}
        </span>
        <span className="mono-tabular relative hidden w-14 shrink-0 text-right text-[14.5px] text-mist @xl/card:block">
          {team.divisionRecord}
        </span>

        <span className="mono-tabular relative w-[52px] shrink-0 text-right text-[16.5px] font-bold text-paper">
          {team.record}
        </span>

        {/* The current run — the differential is in the drawer. */}
        <span
          className="mono-tabular relative w-9 shrink-0 text-right text-[14px] font-semibold"
          style={{
            color: team.streakKind
              ? RESULT_COLOR[team.streakKind]
              : "var(--color-mist)",
          }}
        >
          {team.streakKind ? team.streak : "—"}
        </span>

        <span className="relative hidden shrink-0 @xs/card:block">
          <FormDots form={team.form} />
        </span>
      </button>

      <div className="drawer" data-open={open}>
        <div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-1 pb-4 sm:grid-cols-4 sm:px-5">
            <Detail label="Conference" value={team.conferenceRecord} />
            <Detail label="Division" value={team.divisionRecord} />
            <Detail label={t.home} value={team.homeRecord} />
            <Detail label={t.away} value={team.roadRecord} />
            <Detail label={t.pointsFor} value={String(team.pointsFor)} />
            <Detail label={t.pointsAgainst} value={String(team.pointsAgainst)} />
            <Detail label={t.pointDiff} value={formatDiff(team.pointDiff)} />
            <Detail label={t.winPct} value={formatPct(team.winPct)} />
            <Detail label="Conf. seed" value={`#${team.seed}`} />

            <div className="col-span-2 sm:col-span-4">
              <p className="font-mono text-[12px] tracking-[0.16em] text-mist">
                {t.lastN.replace("{n}", String(team.recent.length))}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {team.recent.length === 0 && (
                  <span className="font-display text-[14.5px] text-mist">
                    {t.noGamesYet}
                  </span>
                )}
                {team.recent.map((game) => (
                  <span
                    key={game.id}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-ink/60 px-1.5 py-1"
                    title={`Week ${game.week}`}
                  >
                    {game.result && <ResultPill result={game.result} />}
                    <span className="font-mono text-[13px] text-mist">
                      {game.home ? "vs" : "@"}
                    </span>
                    <TeamLogo abbr={game.opponent} size={14} />
                    <span className="mono-tabular text-[13px] text-fog">
                      {game.teamScore}–{game.opponentScore}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {team.nextGame && (
              <div className="col-span-2 sm:col-span-4">
                <p className="font-mono text-[12px] tracking-[0.16em] text-mist">
                  {t.next}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-[14px] text-mist">
                    {team.nextGame.home ? "vs" : "@"}
                  </span>
                  <TeamLogo abbr={team.nextGame.opponent} size={18} />
                  <span className="font-display text-[14.5px] text-fog">
                    {team.nextGame.opponent}
                  </span>
                  <span className="mono-tabular text-[14px] text-mist">
                    {team.nextGame.state === "in"
                      ? t.inProgress
                      : formatKickoff(team.nextGame.kickoff, locale)}
                  </span>
                </div>
              </div>
            )}

            <p
              className="col-span-2 font-display text-[14.5px] sm:col-span-4"
              style={{ color: status.color }}
            >
              {t[status.labelKey]}
              {team.status === "bubble" ||
              team.status === "hunt" ||
              team.status === "longshot"
                ? ` · ${(team.gamesBack === 1 ? t.gameBack : t.gamesBack).replace("{n}", formatGames(team.gamesBack))}`
                : ""}
              {team.gamesRemaining > 0
                ? ` · ${t.toPlay.replace("{n}", String(team.gamesRemaining))}`
                : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[12px] tracking-[0.16em] text-mist">
        {label.toUpperCase()}
      </span>
      <span className="mono-tabular text-[14.5px] text-fog">{value}</span>
    </div>
  );
}
