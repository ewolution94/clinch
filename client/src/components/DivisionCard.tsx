import { memo } from "react";
import { TeamRow } from "./TeamRow";
import { TeamWatermark } from "./TeamWatermark";
import type { DivisionView } from "../lib/types";

interface DivisionCardProps {
  division: DivisionView;
}

export const DivisionCard = memo(function DivisionCard({ division }: DivisionCardProps) {
  const leader = division.teams[0];
  const accent = leader?.accent ?? "var(--color-mist)";
  const inField = division.teams.filter((t) => t.seed <= 7).length;

  return (
    <section className="@container/card animate-rise overflow-hidden rounded-2xl border border-line bg-ink/55 backdrop-blur-sm">
      {/* Division banner, carrying the current leader's colours. */}
      <header
        className="relative flex items-center justify-between gap-3 overflow-hidden px-3.5 py-2.5"
        style={{
          background: `linear-gradient(100deg, color-mix(in srgb, ${accent} 24%, transparent) 0%, color-mix(in srgb, ${accent} 5%, transparent) 55%, transparent 100%)`,
        }}
      >
        {leader && <TeamWatermark abbr={leader.abbr} size={82} className="-top-5 right-1 opacity-[0.11]" />}
        <h3 className="relative font-display text-[13px] font-bold tracking-[0.12em] text-paper uppercase">
          {division.teams[0]?.conference} {division.name}
        </h3>
        {/* How much of the division is currently holding a seed — the one thing
            the table below doesn't already say at a glance. */}
        <span
          className="relative mono-tabular rounded-md px-1.5 py-0.5 text-[9.5px] tracking-[0.1em]"
          style={{
            color: inField > 0 ? accent : "var(--color-mist)",
            background: inField > 0 ? `color-mix(in srgb, ${accent} 12%, transparent)` : "transparent",
          }}
        >
          {inField} IN FIELD
        </span>
      </header>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }} />

      <div>
        {division.teams.map((team) => (
          <TeamRow key={team.abbr} team={team} />
        ))}
      </div>
    </section>
  );
});
