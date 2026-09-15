import { memo } from "react";
import { DivisionCard } from "./DivisionCard";
import type { ConferenceView } from "../lib/types";

interface ConferenceStandingsProps {
  conference: ConferenceView;
}

export const ConferenceStandings = memo(function ConferenceStandings({
  conference,
}: ConferenceStandingsProps) {
  const tint =
    conference.id === "AFC" ? "var(--color-brand)" : "var(--color-jade)";

  return (
    <section className="@container flex flex-col gap-4">
      <header className="relative flex items-end px-1">
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
          <span className="relative hidden pb-1.5 font-mono text-[12px] tracking-[0.18em] text-mist @2xl:inline">
            {conference.name.toUpperCase()}
          </span>
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
