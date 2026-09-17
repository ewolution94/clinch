import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { TeamWatermark } from "./TeamWatermark";
import type { BracketMatch } from "../lib/bracket";
import { superBowlNumeral } from "../lib/format";
import type { TeamEntry } from "../lib/types";
import { useStrings } from "../lib/useSettings";

interface SuperBowlCardProps {
  match: BracketMatch | null;
  seasonYear: number;
  onPick: (matchId: string, abbr: string) => void;
  compact?: boolean;
}

function Contender({
  team,
  label,
  source,
  score,
  won,
  decided,
  compact,
  onPick,
}: {
  team: TeamEntry | null;
  label: string;
  source: string | null;
  score: number | null;
  won: boolean;
  decided: boolean;
  compact: boolean;
  onPick: () => void;
}) {
  if (!team) {
    return (
      <div className="flex h-[60px] items-center justify-center rounded-xl border border-dashed border-line/70">
        <span className="font-mono text-[12px] tracking-[0.14em] text-mist/60 uppercase">
          {source || `${label} champion`}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={won}
      title={`Crown the ${team.location} ${team.name}`}
      className={clsx(
        "relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 transition-all",
        compact ? "h-[60px]" : "h-[64px]",
        won
          ? "border-gold/50"
          : decided
            ? "border-line opacity-55"
            : "border-line hover:border-fog/30",
      )}
      style={{
        background: `linear-gradient(96deg, color-mix(in srgb, ${team.accent} ${won ? 34 : 18}%, var(--color-ink)) 0%, var(--color-ink) 78%)`,
      }}
    >
      <TeamWatermark abbr={team.abbr} size={72} opacity={0.18} bleed={10} />
      <TeamLogo
        abbr={team.abbr}
        size={compact ? 34 : 36}
        accent={team.accent}
      />
      {/* Stacked rather than name-beside-record: this column is the narrowest
          part of the bracket, and a side-by-side layout collides here. */}
      <span className="relative flex min-w-0 flex-1 flex-col items-start gap-0.5 leading-none">
        <span className="font-mono text-[11px] tracking-[0.18em] text-mist">
          {label}
        </span>
        <span className="w-full truncate font-display text-[16.5px] font-semibold text-paper">
          {team.name}
        </span>
        <span className="mono-tabular text-[13px] text-fog opacity-80">
          {score !== null ? `${score} pts` : team.record}
        </span>
      </span>
      {won && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow:
              "inset 0 0 32px color-mix(in srgb, var(--color-gold) 22%, transparent)",
          }}
        />
      )}
    </button>
  );
}

export function SuperBowlCard({
  match,
  seasonYear,
  onPick,
  compact = false,
}: SuperBowlCardProps) {
  const t = useStrings();
  const numeral = superBowlNumeral(seasonYear);
  const champion = match?.winner ?? null;
  const decided = champion !== null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-gold/25 p-3 sm:p-4"
      style={{
        background:
          "radial-gradient(ellipse 120% 100% at 50% 0%, color-mix(in srgb, var(--color-gold) 13%, transparent), transparent 70%), var(--color-ink)",
      }}
    >
      <header className="relative mb-3 flex flex-col items-center gap-0.5">
        <span className="font-mono text-[12px] tracking-[0.26em] text-gold">
          {t.superBowl}
        </span>
        <span
          className="font-display text-[30px] leading-none font-bold tracking-[-0.02em] sm:text-[36px]"
          style={{
            background:
              "linear-gradient(180deg, #fff3d4 20%, var(--color-gold) 90%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {numeral}
        </span>
      </header>

      <div className="relative flex flex-col gap-2">
        <Contender
          team={match?.home ?? null}
          label="AFC"
          source={match?.homeSource ?? null}
          score={match?.score?.home ?? null}
          won={decided && champion?.abbr === match?.home?.abbr}
          decided={decided}
          compact={compact}
          onPick={() => match?.home && onPick(match.id, match.home.abbr)}
        />
        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11.5px] tracking-[0.2em] text-mist">
            NEUTRAL SITE
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <Contender
          team={match?.away ?? null}
          label="NFC"
          source={match?.awaySource ?? null}
          score={match?.score?.away ?? null}
          won={decided && champion?.abbr === match?.away?.abbr}
          decided={decided}
          compact={compact}
          onPick={() => match?.away && onPick(match.id, match.away.abbr)}
        />
      </div>

      <p className="relative mt-3 text-center font-mono text-[12px] tracking-[0.14em] text-mist">
        {champion ? (
          <span className="text-gold">
            {champion.location.toUpperCase()} {champion.name.toUpperCase()}
            {match?.decidedBy === "pick" ? " — YOUR PICK" : " — CHAMPIONS"}
          </span>
        ) : match?.home && match?.away ? (
          "TAP A TEAM TO CROWN THEM"
        ) : (
          "WAITING ON BOTH CONFERENCES"
        )}
      </p>
    </section>
  );
}
