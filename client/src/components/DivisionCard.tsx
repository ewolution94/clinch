import { memo } from "react";
import { TeamRow } from "./TeamRow";
import { TeamWatermark } from "./TeamWatermark";
import type { DivisionView } from "../lib/types";

interface DivisionCardProps {
  division: DivisionView;
}

export const DivisionCard = memo(function DivisionCard({
  division,
}: DivisionCardProps) {
  const leader = division.teams[0];
  const accent = leader?.accent ?? "var(--color-mist)";

  return (
    <section
      className="@container/card group/card animate-rise relative overflow-hidden rounded-2xl border border-line bg-ink/55 backdrop-blur-sm transition-colors"
      style={{
        boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${accent} 14%, transparent)`,
      }}
    >
      {/* Division banner, carrying the current leader's colours. */}
      <header
        className="relative flex items-center overflow-hidden px-4 py-3"
        style={{
          background: `linear-gradient(102deg, color-mix(in srgb, ${accent} 30%, transparent) 0%, color-mix(in srgb, ${accent} 7%, transparent) 52%, transparent 100%)`,
        }}
      >
        {leader && (
          <TeamWatermark
            abbr={leader.abbr}
            size={84}
            opacity={0.22}
            bleed={6}
          />
        )}
        <span
          aria-hidden="true"
          className="animate-sheen pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(102deg, transparent 30%, color-mix(in srgb, ${accent} 12%, transparent) 50%, transparent 70%)`,
          }}
        />

        <h3 className="relative font-display text-[16.5px] font-bold tracking-[0.1em] text-paper uppercase">
          {division.teams[0]?.conference} {division.name}
        </h3>
      </header>

      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 20%, transparent) 45%, transparent 78%)`,
        }}
      />

      <div>
        {division.teams.map((team) => (
          <TeamRow key={team.abbr} team={team} />
        ))}
      </div>
    </section>
  );
});
