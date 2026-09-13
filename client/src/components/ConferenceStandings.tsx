import { memo } from "react";
import { DivisionCard } from "./DivisionCard";
import type { ConferenceView } from "../lib/types";

interface ConferenceStandingsProps {
  conference: ConferenceView;
}

export const ConferenceStandings = memo(function ConferenceStandings({ conference }: ConferenceStandingsProps) {
  const inField = conference.seeds.slice(0, 7);
  const tint = conference.id === "AFC" ? "var(--color-pylon)" : "var(--color-jade)";

  return (
    <section className="@container flex flex-col gap-3">
      <header className="flex items-end justify-between gap-4 px-1">
        <div className="flex items-baseline gap-3">
          <h2
            className="font-display text-[34px] leading-none font-bold tracking-[-0.03em] sm:text-[40px]"
            style={{
              background: `linear-gradient(180deg, var(--color-paper) 30%, color-mix(in srgb, ${tint} 60%, var(--color-paper)) 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {conference.id}
          </h2>
          <span className="hidden font-mono text-[10px] tracking-[0.16em] text-mist sm:inline">
            {conference.name.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 pb-1">
          <span className="font-mono text-[9px] tracking-[0.16em] text-mist">FIELD</span>
          {inField.map((team) => (
            <span
              key={team.abbr}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: team.accent }}
              title={`${team.seed}. ${team.location} ${team.name}`}
            />
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        {conference.divisions.map((division) => (
          <DivisionCard key={division.id} division={division} />
        ))}
      </div>
    </section>
  );
});
