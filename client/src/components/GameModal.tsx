import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { TeamWatermark } from "./TeamWatermark";
import { useGameDetail } from "../hooks/useGameDetail";
import { useOverflowEdges, edgeFadeMask } from "../hooks/useOverflowEdges";
import { formatKickoff } from "../lib/format";
import type { GameDetail, GameTeamDetail, ScoringPlayDetail } from "../lib/types";

interface GameModalProps {
  gameId: string;
  onClose: () => void;
}

/* --------------------------------------------------------------- scoring */

/** Defensive and special-teams scores are the ones worth spotting in a list. */
function scoreKind(type: string): "td" | "defensive-td" | "fg" | "other" {
  const t = type.toLowerCase();
  if (t.includes("return touchdown") || t.includes("fumble recovery") || t.includes("safety")) {
    return "defensive-td";
  }
  if (t.includes("touchdown")) return "td";
  if (t.includes("field goal")) return "fg";
  return "other";
}

function periodLabel(period: number, regulation: number): string {
  if (period > regulation) return period - regulation > 1 ? `OT${period - regulation}` : "OT";
  return `Q${period}`;
}

function ScoringPlay({ play, team, isTd }: { play: ScoringPlayDetail; team: GameTeamDetail | undefined; isTd: boolean }) {
  const kind = scoreKind(play.type);
  const accent = team?.accent ?? "var(--color-mist)";

  return (
    <li className="relative flex items-start gap-2.5 py-2 pl-3">
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[2px] rounded-full"
        style={{ background: accent, opacity: isTd ? 0.9 : 0.3 }}
      />
      <span className="mono-tabular w-9 shrink-0 pt-0.5 text-right text-[10px] text-mist">{play.clock}</span>
      <TeamLogo abbr={play.teamAbbr} size={20} accent={accent} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="font-mono text-[8.5px] tracking-[0.14em] uppercase"
          style={{ color: kind === "fg" ? "var(--color-mist)" : accent }}
        >
          {play.type}
          {kind === "defensive-td" && " ·  turnover"}
        </span>
        <span className={clsx("font-display text-[12px] leading-snug", isTd ? "text-paper" : "text-fog")}>
          {play.text}
        </span>
      </span>
      <span className="mono-tabular shrink-0 pt-0.5 text-[11px] font-semibold text-fog">
        {play.away}–{play.home}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------- linescore */

function Linescore({ detail }: { detail: GameDetail }) {
  const [away, home] = detail.teams;
  const columns = Math.max(away.linescores.length, home.linescores.length, detail.regulationPeriods);
  // Everything past the live period hasn't been played, and ESPN reports those
  // as 0 rather than omitting them — so they'd read as scoreless quarters.
  const playedThrough = detail.state === "post" ? columns : (detail.period ?? 0);

  const cell = (team: GameTeamDetail, index: number) =>
    index < playedThrough && index < team.linescores.length ? String(team.linescores[index]) : "—";

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="px-2 py-1.5 text-left font-mono text-[9px] tracking-[0.14em] text-mist">TEAM</th>
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className="px-1 py-1.5 text-center font-mono text-[9px] tracking-[0.14em] text-mist">
              {periodLabel(i + 1, detail.regulationPeriods)}
            </th>
          ))}
          <th className="px-2 py-1.5 text-right font-mono text-[9px] tracking-[0.14em] text-fog">T</th>
        </tr>
      </thead>
      <tbody>
        {detail.teams.map((team) => {
          const other = team === away ? home : away;
          const winning = (team.score ?? 0) > (other.score ?? 0);
          return (
            <tr key={team.abbr} className="border-t border-line-soft">
              <td className="px-2 py-2">
                <span className="flex items-center gap-2">
                  <TeamLogo abbr={team.abbr} size={22} accent={team.accent} />
                  <span className="mono-tabular text-[12px] font-bold text-paper">{team.abbr}</span>
                </span>
              </td>
              {Array.from({ length: columns }, (_, i) => (
                <td key={i} className="mono-tabular px-1 py-2 text-center text-[13px] text-fog">
                  {cell(team, i)}
                </td>
              ))}
              <td
                className={clsx(
                  "mono-tabular px-2 py-2 text-right text-[17px] font-bold",
                  winning ? "text-paper" : "text-mist"
                )}
              >
                {team.score ?? "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------------- header */

function Header({ detail }: { detail: GameDetail }) {
  const [away, home] = detail.teams;
  const live = detail.state === "in";

  const side = (team: GameTeamDetail, align: "left" | "right") => {
    const other = team === away ? home : away;
    const losing = detail.state !== "pre" && (team.score ?? 0) < (other.score ?? 0);
    return (
      <div className={clsx("relative flex flex-1 flex-col gap-1.5", align === "right" && "items-end text-right")}>
        <TeamLogo abbr={team.abbr} size={52} accent={team.accent} eager />
        <span className="font-mono text-[8.5px] tracking-[0.16em] text-mist uppercase">{team.location}</span>
        <span className="font-display text-[17px] leading-none font-bold text-paper">{team.name}</span>
        {team.record && <span className="mono-tabular text-[10px] text-mist">{team.record}</span>}
        {detail.state !== "pre" && (
          <span
            className={clsx(
              "mono-tabular text-[40px] leading-none font-bold sm:text-[52px]",
              losing ? "text-mist" : "text-paper"
            )}
          >
            {team.score ?? 0}
          </span>
        )}
      </div>
    );
  };

  return (
    <header
      className="relative overflow-hidden px-4 pt-5 pb-4 sm:px-6"
      style={{
        background: `linear-gradient(100deg, color-mix(in srgb, ${away.accent} 26%, var(--color-ink)) 0%, var(--color-ink) 42%, var(--color-ink) 58%, color-mix(in srgb, ${home.accent} 26%, var(--color-ink)) 100%)`,
      }}
    >
      <TeamWatermark abbr={away.abbr} size={150} className="-top-8 -left-10 opacity-[0.09]" />
      <TeamWatermark abbr={home.abbr} size={150} className="-top-8 -right-10 opacity-[0.09]" />

      <div className="relative flex items-start gap-3">
        {side(away, "left")}
        <div className="flex shrink-0 flex-col items-center gap-2 pt-4">
          <span className="font-mono text-[9px] tracking-[0.18em] text-mist">@</span>
          {live ? (
            <span className="flex items-center gap-1.5 rounded-full border border-live/35 bg-live/10 px-2 py-1 font-mono text-[9px] tracking-[0.14em] text-live">
              <span className="animate-live-dot h-1.5 w-1.5 rounded-full bg-live" />
              {detail.clock} · {detail.statusDetail.split(" - ")[1] ?? ""}
            </span>
          ) : (
            <span className="rounded-full border border-line bg-abyss-2/70 px-2.5 py-1 text-center font-mono text-[9px] tracking-[0.14em] text-mist">
              {detail.state === "pre" ? formatKickoff(detail.kickoff) : detail.statusDetail}
            </span>
          )}
        </div>
        {side(home, "right")}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- modal */

function Body({ detail }: { detail: GameDetail }) {
  const [away, home] = detail.teams;
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useOverflowEdges(scroller);
  const mask = edgeFadeMask(edges, 20);

  if (detail.state === "pre") {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        <Section label="KICKOFF">
          <p className="font-display text-[14px] text-fog">{formatKickoff(detail.kickoff)}</p>
        </Section>
        {detail.odds && (
          <Section label="LINE">
            <p className="mono-tabular text-[14px] text-fog">{detail.odds}</p>
          </Section>
        )}
        {detail.venue && (
          <Section label="VENUE">
            <p className="font-display text-[13px] text-fog">
              {detail.venue.name}
              {detail.venue.city && ` · ${detail.venue.city}, ${detail.venue.state}`}
            </p>
          </Section>
        )}
        <p className="font-display text-[12px] leading-relaxed text-mist">
          Quarter scores, scoring plays and team numbers appear here once the game kicks off.
        </p>
      </div>
    );
  }

  const periods = Array.from(new Set(detail.scoring.map((p) => p.period))).sort((a, b) => a - b);
  const teamOf = (abbr: string) => detail.teams.find((t) => t.abbr === abbr);

  return (
    <div className="flex flex-col gap-5 px-4 py-4 sm:px-6">
      <Section label="BY QUARTER">
        <div ref={scroller} className="no-scrollbar overflow-x-auto" style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}>
          <div className="min-w-[320px]">
            <Linescore detail={detail} />
          </div>
        </div>
      </Section>

      {periods.length > 0 && (
        <Section label="HOW IT WAS SCORED">
          <div className="flex flex-col gap-3">
            {periods.map((period) => {
              const plays = detail.scoring.filter((p) => p.period === period);
              const last = plays[plays.length - 1];
              return (
                <div key={period}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-line-soft pb-1">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-fog">
                      {periodLabel(period, detail.regulationPeriods)}
                    </span>
                    <span className="mono-tabular text-[10px] text-mist">
                      {away.abbr} {last.away} — {home.abbr} {last.home}
                    </span>
                  </div>
                  <ul className="flex flex-col divide-y divide-line-soft">
                    {plays.map((play) => (
                      <ScoringPlay
                        key={play.id}
                        play={play}
                        team={teamOf(play.teamAbbr)}
                        isTd={scoreKind(play.type) !== "fg"}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {away.leaders.length > 0 && (
        <Section label="STANDOUTS">
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.teams.map((team) => (
              <div key={team.abbr} className="flex flex-col gap-1.5 rounded-xl border border-line bg-abyss-2/50 p-3">
                <span className="flex items-center gap-2">
                  <TeamLogo abbr={team.abbr} size={18} accent={team.accent} />
                  <span className="mono-tabular text-[11px] font-bold text-paper">{team.abbr}</span>
                </span>
                {team.leaders.map((leader) => (
                  <div key={leader.category} className="flex flex-col">
                    <span className="font-mono text-[8.5px] tracking-[0.14em] text-mist uppercase">
                      {leader.category}
                    </span>
                    <span className="font-display text-[12px] text-paper">{leader.athlete}</span>
                    <span className="mono-tabular text-[10.5px] text-mist">{leader.line}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {away.stats.length > 0 && (
        <Section label="TEAM NUMBERS">
          <div className="flex flex-col divide-y divide-line-soft">
            {away.stats.map((stat, i) => (
              <div key={stat.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
                <span className="mono-tabular text-left text-[13px] font-semibold text-paper">{stat.value}</span>
                <span className="font-mono text-[9px] tracking-[0.12em] text-mist uppercase">{stat.label}</span>
                <span className="mono-tabular text-right text-[13px] font-semibold text-paper">
                  {home.stats[i]?.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(detail.venue || detail.attendance) && (
        <p className="font-mono text-[9px] tracking-[0.1em] text-mist">
          {detail.venue?.name}
          {detail.venue?.city && ` · ${detail.venue.city}, ${detail.venue.state}`}
          {detail.attendance ? ` · ${detail.attendance.toLocaleString()} in attendance` : ""}
        </p>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[9px] tracking-[0.18em] text-mist">{label}</h3>
      {children}
    </section>
  );
}

export default function GameModal({ gameId, onClose }: GameModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { detail, loading, error } = useGameDetail(gameId);

  // showModal() is what gives focus trapping, Esc and an inert background —
  // all of which are easy to get wrong by hand.
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // A click on the dialog itself is the backdrop; the panel stops its own.
        if (event.target === dialog.current) onClose();
      }}
      aria-label="Game detail"
      className="game-dialog"
    >
      <div className="game-dialog__panel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-abyss/70 font-mono text-[13px] text-mist backdrop-blur transition-colors hover:border-fog/40 hover:text-paper"
        >
          ✕
        </button>

        {detail ? (
          <>
            <Header detail={detail} />
            <Body detail={detail} />
          </>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
            <p className="font-mono text-[11px] tracking-[0.14em] text-mist">
              {error && !loading ? "COULDN'T LOAD THIS GAME" : "LOADING…"}
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}
