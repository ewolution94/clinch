import { memo } from "react";
import { DivisionCard } from "./DivisionCard";
import { TeamLogo } from "./TeamLogo";
import type { ConferenceView } from "../lib/types";

interface ConferenceStandingsProps {
  conference: ConferenceView;
}

export const ConferenceStandings = memo(function ConferenceStandings({
  conference,
}: ConferenceStandingsProps) {
  const inField = conference.seeds.slice(0, 7);
  const tint =
    conference.id === "AFC" ? "var(--color-brand)" : "var(--color-jade)";

  return (
    <section className="@container flex flex-col gap-4">
      <header className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-1">
        <div className="relative flex items-end gap-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -left-6 h-32 w-52 rounded-full blur-[54px]"
            style={{
              background: `color-mix(in srgb, ${tint} 22%, transparent)`,
            }}
          />
          <h2
            className="relative font-display text-[clamp(46px,10vw,82px)] leading-[0.8] font-bold tracking-[-0.05em]"
            style={{
              background: `linear-gradient(170deg, var(--color-paper) 18%, color-mix(in srgb, ${tint} 75%, var(--color-paper)) 96%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {conference.id}
          </h2>
          <span className="relative hidden pb-1.5 font-mono text-[10.5px] tracking-[0.18em] text-mist @2xl:inline">
            {conference.name.toUpperCase()}
          </span>
        </div>

        {/* The seven teams currently holding a seed, as marks rather than a
            legend — the fastest read on the page. */}
        <div className="relative flex items-center gap-2 pb-1.5">
          <span className="font-mono text-[10px] tracking-[0.18em] text-mist">
            IN THE FIELD
          </span>
          <div className="flex items-center -space-x-1">
            {inField.map((team, i) => (
              <span
                key={team.abbr}
                className="relative rounded-full transition-transform hover:z-10 hover:scale-125"
                style={{ zIndex: 7 - i }}
                title={`${team.seed}. ${team.location} ${team.name} (${team.record})`}
              >
                <TeamLogo abbr={team.abbr} size={26} accent={team.accent} />
              </span>
            ))}
          </div>
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
