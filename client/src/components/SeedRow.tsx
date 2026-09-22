import { memo } from "react";
import { TeamLogo } from "./TeamLogo";
import { FormDots } from "./FormDots";
import { FavouriteStar } from "./Marks";
import { STATUS_META, seedRole } from "../lib/status";
import { useFavourite, useStrings } from "../lib/useSettings";
import { formatGames } from "../lib/format";
import type { TeamEntry } from "../lib/types";

interface SeedRowProps {
  team: TeamEntry;
  /** Chasing teams show how far back they are instead of a seed number. */
  chasing?: boolean;
}

export const SeedRow = memo(function SeedRow({
  team,
  chasing = false,
}: SeedRowProps) {
  const t = useStrings();
  const favourite = useFavourite() === team.abbr;
  const status = STATUS_META[team.status];
  const role = seedRole(team.seed, team.divisionRank);
  const tier = chasing ? status.color : role.color;
  // Leading a division and having clinched it are very different things in
  // November and the same thing in January — only say it while it's news.
  const clinched =
    team.gamesRemaining > 0 && team.status.startsWith("clinched");

  /*
   * No watermark on this row, deliberately. The record and the form dots live in
   * the bottom-right corner, which is exactly where the mark used to be bled —
   * so every row had its two most-read values sitting on top of a logo. There is
   * no free corner in a row this dense; the accent wash and the chip carry the
   * team identity instead.
   */
  return (
    <article
      className="animate-rise relative flex items-stretch overflow-hidden rounded-xl border border-line bg-ink/60"
      style={{
        background: `linear-gradient(90deg, color-mix(in srgb, ${team.accent} 22%, var(--color-ink)) 0%, color-mix(in srgb, ${team.accent} 7%, var(--color-ink)) 42%, var(--color-ink) 78%)`,
        ...(favourite && {
          borderColor: `color-mix(in srgb, ${team.accent} 55%, transparent)`,
        }),
      }}
    >
      <div
        className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-r sm:w-14"
        style={{
          borderColor: `color-mix(in srgb, ${tier} 25%, transparent)`,
          background: `color-mix(in srgb, ${tier} 10%, transparent)`,
        }}
      >
        <span
          className="mono-tabular text-[23px] leading-none font-bold sm:text-[26px]"
          style={{ color: tier }}
        >
          {chasing ? formatGames(team.gamesBack) : team.seed}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-mist">
          {chasing ? (team.gamesBack === 0 ? "LEVEL" : "BACK") : "SEED"}
        </span>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-3.5">
        <TeamLogo abbr={team.abbr} size={34} accent={team.accent} />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[13px] tracking-[0.1em] text-mist uppercase">
            {team.location}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-display text-[16.5px] leading-tight font-semibold text-paper">
              {team.name}
            </span>
            {favourite && <FavouriteStar accent={team.accent} size={13} />}
          </span>
          <span
            className="mt-0.5 truncate font-mono text-[12.5px] tracking-[0.06em]"
            style={{ color: tier }}
          >
            {chasing
              ? `${team.conference} ${team.division} · ${t[status.labelKey]}`
              : `${role.label.toUpperCase()}${clinched ? " · CLINCHED" : ""}`}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="mono-tabular text-[18.5px] leading-none font-bold text-paper">
            {team.record}
          </span>
          <FormDots form={team.form} />
        </div>
      </div>
    </article>
  );
});
