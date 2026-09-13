import { memo } from "react";
import { TeamLogo } from "./TeamLogo";
import { seedRole } from "../lib/status";
import type { ConferenceView, TeamEntry } from "../lib/types";

interface BracketPreviewProps {
  conference: ConferenceView;
}

function Side({ team, seed }: { team: TeamEntry | undefined; seed: number }) {
  if (!team) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        className="mono-tabular w-3 text-[10px] font-bold"
        style={{ color: seedRole(seed, team.divisionRank).color }}
      >
        {seed}
      </span>
      <TeamLogo abbr={team.abbr} size={22} accent={team.accent} />
      <div className="flex min-w-0 flex-col leading-none">
        <span className="mono-tabular truncate text-[11px] font-bold text-paper">{team.abbr}</span>
        <span className="mono-tabular mt-0.5 text-[9px] text-mist">{team.record}</span>
      </div>
    </div>
  );
}

/**
 * If the season ended today: seed 1 rests, 2v7, 3v6, 4v5. It's the fastest way
 * to read a conference — the seeds are already a ranking, this shows the shape
 * they actually produce.
 */
export const BracketPreview = memo(function BracketPreview({ conference }: BracketPreviewProps) {
  const bySeed = new Map(conference.seeds.map((t) => [t.seed, t]));
  const bye = conference.byeTeam ? bySeed.get(1) : undefined;

  return (
    <div className="rounded-2xl border border-line bg-ink/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[10px] tracking-[0.18em] text-mist">IF THE SEASON ENDED TODAY</h3>
        <span className="font-mono text-[9px] tracking-[0.14em] text-mist">WILD CARD ROUND</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {bye && (
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-xl border p-2.5"
            style={{
              borderColor: "color-mix(in srgb, var(--color-gold) 30%, transparent)",
              background: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
            }}
          >
            <span className="font-mono text-[9px] tracking-[0.14em] text-gold">FIRST-ROUND BYE</span>
            <div className="mt-2 flex items-center gap-2">
              <TeamLogo abbr={bye.abbr} size={26} accent={bye.accent} />
              <div className="flex min-w-0 flex-col leading-none">
                <span className="mono-tabular truncate text-[12px] font-bold text-paper">{bye.abbr}</span>
                <span className="mono-tabular mt-0.5 text-[9px] text-mist">{bye.record}</span>
              </div>
            </div>
          </div>
        )}

        {conference.wildCardGames.map((game) => (
          <div
            key={`${game.higher}-${game.lower}`}
            className="flex flex-col gap-1.5 rounded-xl border border-line bg-abyss-2/70 p-2.5"
          >
            <Side team={bySeed.get(game.higherSeed)} seed={game.higherSeed} />
            <div className="flex items-center gap-2 pl-3">
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[8px] tracking-[0.14em] text-mist">VS</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <Side team={bySeed.get(game.lowerSeed)} seed={game.lowerSeed} />
          </div>
        ))}
      </div>
    </div>
  );
});
