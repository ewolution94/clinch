import { memo } from "react";
import { SeedRow } from "./SeedRow";
import { TeamLogo } from "./TeamLogo";
import { STATUS_META } from "../lib/status";
import { useStrings } from "../lib/useSettings";
import type { ConferenceView } from "../lib/types";

interface PlayoffColumnProps {
  conference: ConferenceView;
}

function SectionLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h3 className="font-mono text-[13px] tracking-[0.18em] text-mist">
        {children}
      </h3>
      {hint && (
        <span className="font-mono text-[12px] tracking-[0.12em] text-mist opacity-70">
          {hint}
        </span>
      )}
    </div>
  );
}

export const PlayoffColumn = memo(function PlayoffColumn({
  conference,
}: PlayoffColumnProps) {
  const t = useStrings();
  const field = conference.seeds.filter((team) => team.seed <= 7);
  const chasing = conference.seeds.filter(
    (t) => t.seed > 7 && t.status !== "eliminated",
  );
  const eliminated = conference.seeds.filter((t) => t.status === "eliminated");
  const tint =
    conference.id === "AFC" ? "var(--color-brand)" : "var(--color-jade)";

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-3 px-1">
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
        <span className="hidden font-mono text-[13px] tracking-[0.16em] text-mist sm:inline">
          {conference.name.toUpperCase()}
        </span>
      </header>

      <SectionLabel>{t.inTheField}</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {field.map((team) => (
          <SeedRow key={team.abbr} team={team} />
        ))}
      </div>

      {/* The cut line is the whole point of the page — make it a real object. */}
      <div className="flex items-center gap-3 px-1 py-1">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-live/50 to-live/50" />
        <span className="font-mono text-[12px] tracking-[0.2em] text-live/80">
          {t.cutLine}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-live/50 to-live/50" />
      </div>

      {chasing.length > 0 && (
        <>
          <SectionLabel>{t.stillAlive}</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {chasing.map((team) => (
              <SeedRow key={team.abbr} team={team} chasing />
            ))}
          </div>
        </>
      )}

      {eliminated.length > 0 && (
        <>
          <SectionLabel
            hint={`${eliminated.length} TEAM${eliminated.length === 1 ? "" : "S"}`}
          >
            {t.eliminated}
          </SectionLabel>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-ink/40 p-2.5">
            {eliminated.map((team) => (
              <span
                key={team.abbr}
                className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-abyss-2/60 px-2 py-1.5 opacity-55 transition-opacity hover:opacity-90"
                title={`${team.location} ${team.name} — ${t[STATUS_META[team.status].labelKey]}`}
              >
                <TeamLogo abbr={team.abbr} size={18} accent={team.accent} />
                <span className="mono-tabular text-[13px] font-semibold text-fog">
                  {team.abbr}
                </span>
                <span className="mono-tabular text-[13px] text-mist">
                  {team.record}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
});
