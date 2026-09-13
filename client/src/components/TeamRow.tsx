import { memo, useState } from "react";
import { TeamLogo } from "./TeamLogo";
import { FormDots } from "./FormDots";
import { STATUS_META } from "../lib/status";
import { formatDiff, formatKickoff, formatPct } from "../lib/format";
import type { TeamEntry } from "../lib/types";

interface TeamRowProps {
  team: TeamEntry;
  /** Draws the line between the 4th and 5th team of a division. */
  showRank?: boolean;
}

function ResultPill({ result }: { result: "W" | "L" | "T" }) {
  const color = result === "W" ? "var(--color-jade)" : result === "L" ? "var(--color-live)" : "var(--color-mist)";
  return (
    <span
      className="mono-tabular flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {result}
    </span>
  );
}

export const TeamRow = memo(function TeamRow({ team, showRank = true }: TeamRowProps) {
  const [open, setOpen] = useState(false);
  const status = STATUS_META[team.status];

  return (
    <div
      className="relative border-t border-line-soft first:border-t-0"
      style={open ? { background: `color-mix(in srgb, ${team.accent} 6%, transparent)` } : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 px-2.5 py-2.5 text-left transition-colors hover:bg-ink-2/60 @xl/card:gap-3 @xl/card:px-3"
      >
        {/* Team colour edge — the only place each team's brand is asserted at
            full strength, so 16 rows stay scannable rather than a rainbow. */}
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full transition-opacity group-hover:opacity-100"
          style={{ background: team.accent, opacity: status.inField ? 0.9 : 0.35 }}
        />

        {showRank && (
          <span className="mono-tabular w-3 shrink-0 text-center text-[10px] text-mist">{team.divisionRank}</span>
        )}

        <TeamLogo abbr={team.abbr} size={26} glow={team.accent} />

        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="mono-tabular shrink-0 text-[13px] font-bold tracking-tight text-paper">{team.abbr}</span>
          <span className="truncate font-display text-[13px] text-fog">
            <span className="hidden @lg/card:inline">{team.location} </span>
            {team.name}
          </span>
        </span>

        {/* Win percentage is redundant next to a 17-game record, so it lives in
            the drawer; these two only appear once the card is genuinely wide. */}
        <span className="mono-tabular hidden w-14 shrink-0 text-right text-[12px] text-mist @xl/card:block">
          {team.conferenceRecord}
        </span>
        <span className="mono-tabular hidden w-14 shrink-0 text-right text-[12px] text-mist @xl/card:block">
          {team.divisionRecord}
        </span>

        <span className="mono-tabular w-12 shrink-0 text-right text-[13px] font-semibold text-paper">
          {team.record}
        </span>

        <span
          className="mono-tabular w-9 shrink-0 text-right text-[11px]"
          style={{ color: team.pointDiff > 0 ? "var(--color-jade)" : team.pointDiff < 0 ? "var(--color-live)" : undefined }}
        >
          {formatDiff(team.pointDiff)}
        </span>

        <span className="hidden shrink-0 @xs/card:block">
          <FormDots form={team.form} />
        </span>

        <span
          className="mono-tabular flex h-5 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wide"
          style={{
            color: status.color,
            background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${status.color} 22%, transparent)`,
          }}
          title={`${status.label} · conference seed ${team.seed}`}
        >
          {team.seed <= 7 ? team.seed : status.short}
        </span>
      </button>

      <div className="drawer" data-open={open}>
        <div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-1 pb-4 sm:grid-cols-4 sm:px-5">
            <Detail label="Conference" value={team.conferenceRecord} />
            <Detail label="Division" value={team.divisionRecord} />
            <Detail label="Home" value={team.homeRecord} />
            <Detail label="Away" value={team.roadRecord} />
            <Detail label="Points for" value={String(team.pointsFor)} />
            <Detail label="Against" value={String(team.pointsAgainst)} />
            <Detail label="Streak" value={team.streak || "—"} />
            <Detail label="Win pct" value={formatPct(team.winPct)} />

            <div className="col-span-2 sm:col-span-4">
              <p className="font-mono text-[9px] tracking-[0.16em] text-mist">LAST {team.recent.length || 0}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {team.recent.length === 0 && <span className="font-display text-[12px] text-mist">No games played yet</span>}
                {team.recent.map((game) => (
                  <span
                    key={game.id}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-ink/60 px-1.5 py-1"
                    title={`Week ${game.week}`}
                  >
                    {game.result && <ResultPill result={game.result} />}
                    <span className="font-mono text-[10px] text-mist">{game.home ? "vs" : "@"}</span>
                    <TeamLogo abbr={game.opponent} size={14} />
                    <span className="mono-tabular text-[10px] text-fog">
                      {game.teamScore}–{game.opponentScore}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {team.nextGame && (
              <div className="col-span-2 sm:col-span-4">
                <p className="font-mono text-[9px] tracking-[0.16em] text-mist">NEXT</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-mist">{team.nextGame.home ? "vs" : "@"}</span>
                  <TeamLogo abbr={team.nextGame.opponent} size={18} />
                  <span className="font-display text-[12px] text-fog">{team.nextGame.opponent}</span>
                  <span className="mono-tabular text-[11px] text-mist">
                    {team.nextGame.state === "in" ? "in progress" : formatKickoff(team.nextGame.kickoff)}
                  </span>
                </div>
              </div>
            )}

            <p
              className="col-span-2 font-display text-[12px] sm:col-span-4"
              style={{ color: status.color }}
            >
              {status.label}
              {team.status === "bubble" || team.status === "hunt" || team.status === "longshot"
                ? ` · ${team.gamesBack} ${team.gamesBack === 1 ? "game" : "games"} back of the 7 seed`
                : ""}
              {team.gamesRemaining > 0 ? ` · ${team.gamesRemaining} to play` : ""}
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
      <span className="font-mono text-[9px] tracking-[0.16em] text-mist">{label.toUpperCase()}</span>
      <span className="mono-tabular text-[12px] text-fog">{value}</span>
    </div>
  );
}
