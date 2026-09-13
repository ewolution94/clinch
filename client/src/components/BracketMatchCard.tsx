import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import type { BracketMatch } from "../lib/bracket";
import type { TeamEntry } from "../lib/types";

interface BracketMatchCardProps {
  match: BracketMatch;
  onPick: (matchId: string, abbr: string) => void;
  /** Mirrors the layout for the NFC half so both sides read inward. */
  mirrored?: boolean;
  size?: "sm" | "lg";
}

interface SideProps {
  team: TeamEntry | null;
  won: boolean;
  decided: boolean;
  mirrored: boolean;
  size: "sm" | "lg";
  onPick: () => void;
}

function Side({ team, won, decided, mirrored, size, onPick }: SideProps) {
  const large = size === "lg";

  if (!team) {
    return (
      <div className={clsx("flex items-center px-2.5", large ? "h-12" : "h-9")}>
        <span className="font-mono text-[10px] tracking-[0.14em] text-mist opacity-50">TBD</span>
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
        large ? "h-12" : "h-9",
        mirrored && "flex-row-reverse",
        won ? "text-paper" : decided ? "text-mist" : "text-fog"
      )}
      style={
        won
          ? {
              background: `linear-gradient(${mirrored ? "270deg" : "90deg"}, color-mix(in srgb, ${team.accent} 30%, transparent), transparent 85%)`,
            }
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className={clsx("absolute inset-y-0 w-[3px] transition-opacity", mirrored ? "right-0" : "left-0")}
        style={{ background: team.accent, opacity: won ? 1 : 0.25 }}
      />
      <span className={clsx("mono-tabular shrink-0 text-[9px] text-mist", mirrored ? "pl-1" : "pr-0.5")}>
        {team.seed}
      </span>
      <TeamLogo abbr={team.abbr} size={large ? 26 : 20} glow={won ? team.accent : undefined} />
      <span
        className={clsx(
          "flex min-w-0 flex-1 items-baseline gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        <span className={clsx("mono-tabular shrink-0 font-bold", large ? "text-[14px]" : "text-[12px]")}>
          {team.abbr}
        </span>
        {/* Desktop bracket columns are ~140px; a phone's are full width. Only
            the wide ones have room for a name next to the abbreviation. */}
        <span className="hidden truncate font-display text-[13px] opacity-85 @[260px]/match:inline">
          {team.name}
        </span>
      </span>
      <span className={clsx("mono-tabular shrink-0 opacity-70", large ? "text-[11px]" : "text-[10px]")}>
        {team.record}
      </span>
    </button>
  );
}

export function BracketMatchCard({ match, onPick, mirrored = false, size = "sm" }: BracketMatchCardProps) {
  const decided = match.winner !== null;

  return (
    <div
      className={clsx(
        "@container/match overflow-hidden rounded-lg border bg-ink/70 backdrop-blur-sm transition-colors",
        match.picked ? "border-pylon/45" : "border-line hover:border-line/80"
      )}
    >
      <Side
        team={match.home}
        won={decided && match.winner?.abbr === match.home?.abbr}
        decided={decided}
        mirrored={mirrored}
        size={size}
        onPick={() => match.home && onPick(match.id, match.home.abbr)}
      />
      <div className="h-px bg-line-soft" />
      <Side
        team={match.away}
        won={decided && match.winner?.abbr === match.away?.abbr}
        decided={decided}
        mirrored={mirrored}
        size={size}
        onPick={() => match.away && onPick(match.id, match.away.abbr)}
      />
    </div>
  );
}

/** The 1 seed enters at the divisional round, so it needs a slot of its own. */
export function ByeCard({ team, mirrored = false }: { team: TeamEntry | null; mirrored?: boolean }) {
  if (!team) return null;

  return (
    <div
      className="@container/match overflow-hidden rounded-lg border border-gold/30"
      style={{ background: `linear-gradient(${mirrored ? "270deg" : "90deg"}, color-mix(in srgb, ${team.accent} 26%, var(--color-ink)), var(--color-ink) 85%)` }}
    >
      <div className={clsx("flex h-9 items-center gap-2 px-2.5", mirrored && "flex-row-reverse")}>
        <span className="mono-tabular shrink-0 text-[9px] text-gold">1</span>
        <TeamLogo abbr={team.abbr} size={20} glow={team.accent} />
        <span className={clsx("flex min-w-0 flex-1 items-baseline gap-2", mirrored && "flex-row-reverse")}>
          <span className="mono-tabular shrink-0 text-[12px] font-bold text-paper">{team.abbr}</span>
          <span className="hidden truncate font-display text-[13px] text-fog @[260px]/match:inline">{team.name}</span>
        </span>
        <span className="mono-tabular shrink-0 text-[10px] text-mist">{team.record}</span>
      </div>
      <div className={clsx("flex h-6 items-center bg-gold/10 px-2.5", mirrored && "justify-end")}>
        <span className="font-mono text-[8.5px] tracking-[0.16em] text-gold">FIRST-ROUND BYE</span>
      </div>
    </div>
  );
}
