import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import type { BracketMatch } from "../lib/bracket";
import type { TeamEntry } from "../lib/types";

interface BracketMatchCardProps {
  match: BracketMatch;
  onPick: (matchId: string, abbr: string) => void;
  /** Only offered once a real game exists behind the matchup. */
  onOpenGame?: (id: string) => void;
  /** The single card allowed to carry a `view-transition-name` right now. */
  morphCardId?: string | null;
  /** Mirrors the layout for the NFC half so both sides read inward. */
  mirrored?: boolean;
  size?: "sm" | "lg";
}

interface SideProps {
  team: TeamEntry | null;
  source: string | null;
  score: number | null;
  won: boolean;
  lost: boolean;
  mirrored: boolean;
  size: "sm" | "lg";
  onPick: () => void;
}

function Side({
  team,
  source,
  score,
  won,
  lost,
  mirrored,
  size,
  onPick,
}: SideProps) {
  const large = size === "lg";
  const height = large ? "h-12" : "h-9";

  // An unfilled slot says where its team will come from, quietly.
  if (!team) {
    return (
      <div
        className={clsx(
          "flex items-center px-2.5",
          height,
          mirrored && "flex-row-reverse",
        )}
      >
        <span className="truncate font-mono text-[8.5px] tracking-[0.12em] text-mist/55 uppercase">
          {source || "TBD"}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={won}
      title={`Advance ${team.location} ${team.name}`}
      className={clsx(
        "group/side relative flex w-full items-center gap-2 overflow-hidden px-2.5 transition-colors",
        height,
        mirrored && "flex-row-reverse",
        won
          ? "text-paper"
          : lost
            ? "text-mist opacity-55"
            : "text-fog hover:text-paper",
      )}
      style={
        won
          ? {
              background: `linear-gradient(${mirrored ? "270deg" : "90deg"}, color-mix(in srgb, ${team.accent} 28%, transparent), transparent 85%)`,
            }
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-y-0 w-[3px] transition-opacity",
          mirrored ? "right-0" : "left-0",
        )}
        style={{ background: team.accent, opacity: won ? 1 : lost ? 0.2 : 0.4 }}
      />
      <span
        className={clsx(
          "mono-tabular shrink-0 text-[9px] text-mist",
          mirrored ? "pl-1" : "pr-0.5",
        )}
      >
        {team.seed}
      </span>
      <TeamLogo abbr={team.abbr} size={large ? 26 : 20} accent={team.accent} />
      <span
        className={clsx(
          "flex min-w-0 flex-1 items-baseline gap-2",
          mirrored && "flex-row-reverse",
        )}
      >
        <span
          className={clsx(
            "mono-tabular shrink-0 font-bold",
            large ? "text-[14px]" : "text-[12px]",
          )}
        >
          {team.abbr}
        </span>
        {/* Desktop bracket columns are ~140px; a phone's are full width. Only
            the wide ones have room for a name next to the abbreviation. */}
        <span className="hidden truncate font-display text-[13px] opacity-85 @[260px]/match:inline">
          {team.name}
        </span>
      </span>
      <span
        className={clsx(
          "mono-tabular shrink-0",
          large ? "text-[12px]" : "text-[11px]",
          score !== null ? "font-bold" : "opacity-70",
        )}
      >
        {score !== null ? score : team.record}
      </span>
    </button>
  );
}

export function BracketMatchCard({
  match,
  onPick,
  onOpenGame,
  morphCardId,
  mirrored = false,
  size = "sm",
}: BracketMatchCardProps) {
  const settled = match.winner !== null;
  const homeWon = settled && match.winner?.abbr === match.home?.abbr;
  const awayWon = settled && match.winner?.abbr === match.away?.abbr;

  const openable = Boolean(match.gameId && onOpenGame);

  return (
    <div
      style={
        match.gameId && match.gameId === morphCardId
          ? { viewTransitionName: `game-${match.gameId}` }
          : undefined
      }
      className={clsx(
        "@container/match relative overflow-hidden rounded-lg border bg-ink/70 backdrop-blur-sm transition-colors",
        match.decidedBy === "pick"
          ? "border-brand/45"
          : match.decidedBy === "played"
            ? "border-line"
            : "border-line/70 hover:border-line",
      )}
    >
      {/* Only a real fixture gets this. A projected matchup has no game to open. */}
      {openable && (
        <button
          type="button"
          onClick={() => onOpenGame?.(match.gameId!)}
          data-game-id={match.gameId}
          aria-label="Game detail"
          title="Game detail"
          className="absolute right-1 bottom-1 z-10 flex h-5 w-5 items-center justify-center rounded-md border border-line bg-abyss/80 font-mono text-[9px] text-mist transition-colors hover:border-fog/40 hover:text-paper"
        >
          ↗
        </button>
      )}
      {match.decidedBy === "pick" && (
        <span
          className="absolute top-0 right-0 z-10 rounded-bl-md bg-brand/18 px-1.5 py-0.5 font-mono text-[7.5px] tracking-[0.14em] text-brand"
          title="Your prediction, not a result"
        >
          PICK
        </span>
      )}
      <Side
        team={match.home}
        source={match.homeSource}
        score={match.score?.home ?? null}
        won={homeWon}
        lost={settled && !homeWon}
        mirrored={mirrored}
        size={size}
        onPick={() => match.home && onPick(match.id, match.home.abbr)}
      />
      <div className="h-px bg-line-soft" />
      <Side
        team={match.away}
        source={match.awaySource}
        score={match.score?.away ?? null}
        won={awayWon}
        lost={settled && !awayWon}
        mirrored={mirrored}
        size={size}
        onPick={() => match.away && onPick(match.id, match.away.abbr)}
      />
    </div>
  );
}

/** The 1 seed enters at the divisional round, so it needs a slot of its own. */
export function ByeCard({
  team,
  mirrored = false,
}: {
  team: TeamEntry | null;
  mirrored?: boolean;
}) {
  if (!team) return null;

  return (
    <div
      className="@container/match overflow-hidden rounded-lg border border-gold/30"
      style={{
        background: `linear-gradient(${mirrored ? "270deg" : "90deg"}, color-mix(in srgb, ${team.accent} 24%, var(--color-ink)), var(--color-ink) 85%)`,
      }}
    >
      <div
        className={clsx(
          "flex h-9 items-center gap-2 px-2.5",
          mirrored && "flex-row-reverse",
        )}
      >
        <span className="mono-tabular shrink-0 text-[9px] text-gold">1</span>
        <TeamLogo abbr={team.abbr} size={20} accent={team.accent} />
        <span
          className={clsx(
            "flex min-w-0 flex-1 items-baseline gap-2",
            mirrored && "flex-row-reverse",
          )}
        >
          <span className="mono-tabular shrink-0 text-[12px] font-bold text-paper">
            {team.abbr}
          </span>
          <span className="hidden truncate font-display text-[13px] text-fog @[260px]/match:inline">
            {team.name}
          </span>
        </span>
        <span className="mono-tabular shrink-0 text-[10px] text-mist">
          {team.record}
        </span>
      </div>
      <div
        className={clsx(
          "flex h-6 items-center bg-gold/10 px-2.5",
          mirrored && "justify-end",
        )}
      >
        <span className="font-mono text-[8.5px] tracking-[0.16em] text-gold">
          FIRST-ROUND BYE
        </span>
      </div>
    </div>
  );
}
