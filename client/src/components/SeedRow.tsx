import { memo } from "react";
import { TeamLogo } from "./TeamLogo";
import { TeamWatermark } from "./TeamWatermark";
import { FormDots } from "./FormDots";
import { STATUS_META, seedRole } from "../lib/status";
import { formatGames } from "../lib/format";
import type { TeamEntry } from "../lib/types";

interface SeedRowProps {
  team: TeamEntry;
  /** Chasing teams show how far back they are instead of a seed number. */
  chasing?: boolean;
}

export const SeedRow = memo(function SeedRow({ team, chasing = false }: SeedRowProps) {
  const status = STATUS_META[team.status];
  const role = seedRole(team.seed, team.divisionRank);
  const tier = chasing ? status.color : role.color;
  // Leading a division and having clinched it are very different things in
  // November and the same thing in January — only say it while it's news.
  const clinched = team.gamesRemaining > 0 && team.status.startsWith("clinched");

  return (
    <article
      className="animate-rise relative flex items-stretch overflow-hidden rounded-xl border border-line bg-ink/60"
      style={{
        background: `linear-gradient(90deg, color-mix(in srgb, ${team.accent} 17%, var(--color-ink)) 0%, color-mix(in srgb, ${team.accent} 5%, var(--color-ink)) 40%, var(--color-ink) 78%)`,
      }}
    >
      {/* The team's own mark, blown up and bled off the right edge — the banner. */}
      <TeamWatermark abbr={team.abbr} size={110} className="-right-5 -bottom-7 opacity-[0.1]" />

      <div
        className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-r sm:w-14"
        style={{
          borderColor: `color-mix(in srgb, ${tier} 25%, transparent)`,
          background: `color-mix(in srgb, ${tier} 10%, transparent)`,
        }}
      >
        <span className="mono-tabular text-[22px] leading-none font-bold sm:text-[26px]" style={{ color: tier }}>
          {chasing ? formatGames(team.gamesBack) : team.seed}
        </span>
        <span className="font-mono text-[8px] tracking-[0.12em] text-mist">
          {chasing ? (team.gamesBack === 0 ? "LEVEL" : "BACK") : "SEED"}
        </span>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-3.5">
        <TeamLogo abbr={team.abbr} size={34} accent={team.accent} />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[10px] tracking-[0.1em] text-mist uppercase">
            {team.location}
          </span>
          <span className="truncate font-display text-[15px] leading-tight font-semibold text-paper">{team.name}</span>
          <span className="mt-0.5 truncate font-mono text-[9.5px] tracking-[0.06em]" style={{ color: tier }}>
            {chasing
              ? `${team.conference} ${team.division} · ${status.label}`
              : `${role.label.toUpperCase()}${clinched ? " · CLINCHED" : ""}`}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="mono-tabular text-[17px] leading-none font-bold text-paper">{team.record}</span>
          <FormDots form={team.form} />
        </div>
      </div>
    </article>
  );
});
