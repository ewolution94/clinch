import { memo } from "react";
import { TeamLogo } from "./TeamLogo";
import { TeamWatermark } from "./TeamWatermark";
import type { Snapshot, TeamEntry } from "../lib/types";

interface SeasonHeroProps {
  snapshot: Snapshot;
}

function TopSeed({ team, conference, align }: { team: TeamEntry; conference: string; align: "left" | "right" }) {
  return (
    <div
      className="relative flex flex-1 items-center gap-3 overflow-hidden rounded-xl border border-line/70 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
      style={{
        background: `linear-gradient(${align === "left" ? "95deg" : "265deg"}, color-mix(in srgb, ${team.accent} 24%, transparent) 0%, transparent 72%)`,
      }}
    >
      <TeamWatermark
        abbr={team.abbr}
        size={130}
        className={`${align === "left" ? "-right-8" : "-left-8"} -bottom-10 opacity-[0.1]`}
      />
      <TeamLogo abbr={team.abbr} size={48} accent={team.accent} eager />
      <div className="relative flex min-w-0 flex-col leading-none">
        <span className="font-mono text-[8.5px] tracking-[0.2em]" style={{ color: team.accent }}>
          {conference} NO. 1 SEED
        </span>
        <span className="mt-1 truncate font-display text-[17px] font-bold tracking-tight text-paper sm:text-[20px]">
          {team.name}
        </span>
        <span className="mono-tabular mt-1 text-[11px] text-mist">
          {team.record} · {team.streak}
        </span>
      </div>
    </div>
  );
}

/**
 * The banner the standings sit under: where the season is, and who is currently
 * on top of each conference. Every colour on it comes from those two teams, so
 * it changes character as the season turns over.
 */
export const SeasonHero = memo(function SeasonHero({ snapshot }: SeasonHeroProps) {
  const afc = snapshot.conferences.find((c) => c.id === "AFC")?.seeds[0];
  const nfc = snapshot.conferences.find((c) => c.id === "NFC")?.seeds[0];
  const played = snapshot.week.number;
  const progress = Math.min(100, (played / snapshot.week.total) * 100);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-ink/45 p-4 backdrop-blur-sm sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: afc && nfc
            ? `radial-gradient(ellipse 60% 120% at 0% 50%, color-mix(in srgb, ${afc.accent} 16%, transparent), transparent 70%), radial-gradient(ellipse 60% 120% at 100% 50%, color-mix(in srgb, ${nfc.accent} 16%, transparent), transparent 70%)`
            : undefined,
        }}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="shrink-0">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-[clamp(38px,9vw,76px)] leading-[0.85] font-bold tracking-[-0.045em] text-paper">
              {snapshot.season.type === 2 ? `WEEK ${played}` : snapshot.week.label.toUpperCase()}
            </h1>
            <span className="mono-tabular text-[13px] text-mist">/ {snapshot.week.total}</span>
          </div>

          <div className="mt-3 flex items-center gap-3 lg:w-[260px]">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand via-gold to-jade transition-[width] duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="mono-tabular shrink-0 text-[10px] tracking-wide text-mist">
              {snapshot.season.year}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-3">
          {afc && <TopSeed team={afc} conference="AFC" align="left" />}
          {nfc && <TopSeed team={nfc} conference="NFC" align="right" />}
        </div>
      </div>
    </section>
  );
});
