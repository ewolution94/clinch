import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";
import { TeamWatermark } from "./TeamWatermark";
import { Shimmer } from "./Shimmer";
import { useGameDetail } from "../hooks/useGameDetail";
import { useOverflowEdges, edgeFadeMask } from "../hooks/useOverflowEdges";
import { formatKickoff } from "../lib/format";
import { useLocale, useSettings, useStrings } from "../lib/useSettings";
import { abroadLabel } from "../lib/abroad";
import type { Lang } from "../lib/settings";
import { lockScroll } from "../lib/scrollLock";

/**
 * How far a finger may travel and still count as a tap on the backdrop.
 *
 * The browser's own threshold is stricter than a thumb: a tap that drifted
 * ~12px was treated as a drag, so no click was ever sent and the dialog stayed
 * open. The close button above the panel is the way out; this only keeps the
 * backdrop working as a shortcut. Generous on purpose — nothing on the
 * backdrop responds to a swipe.
 */
const TAP_SLOP = 32;

import type {
  GameDetail,
  GameTeamDetail,
  ScoringPlayDetail,
} from "../lib/types";

interface GameModalProps {
  gameId: string;
  onClose: () => void;
}

/* --------------------------------------------------------------- scoring */

/** Defensive and special-teams scores are the ones worth spotting in a list. */
function scoreKind(type: string): "td" | "defensive-td" | "fg" | "other" {
  const t = type.toLowerCase();
  if (
    t.includes("return touchdown") ||
    t.includes("fumble recovery") ||
    t.includes("safety")
  ) {
    return "defensive-td";
  }
  if (t.includes("touchdown")) return "td";
  if (t.includes("field goal")) return "fg";
  return "other";
}

function periodLabel(period: number, regulation: number): string {
  if (period > regulation)
    return period - regulation > 1 ? `OT${period - regulation}` : "OT";
  return `Q${period}`;
}

function ScoringPlay({
  play,
  team,
  isTd,
}: {
  play: ScoringPlayDetail;
  team: GameTeamDetail | undefined;
  isTd: boolean;
}) {
  const kind = scoreKind(play.type);
  const accent = team?.accent ?? "var(--color-mist)";

  return (
    <li className="relative flex items-start gap-2.5 py-2 pl-3">
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[2px] rounded-full"
        style={{ background: accent, opacity: isTd ? 0.9 : 0.3 }}
      />
      <span className="mono-tabular w-9 shrink-0 pt-0.5 text-right text-[13px] text-mist">
        {play.clock}
      </span>
      <TeamLogo abbr={play.teamAbbr} size={20} accent={accent} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="font-mono text-[11.5px] tracking-[0.14em] uppercase"
          style={{ color: kind === "fg" ? "var(--color-mist)" : accent }}
        >
          {play.type}
          {kind === "defensive-td" && " ·  turnover"}
        </span>
        <span
          className={clsx(
            "font-display text-[14.5px] leading-snug",
            isTd ? "text-paper" : "text-fog",
          )}
        >
          {play.text}
        </span>
      </span>
      <span className="mono-tabular shrink-0 pt-0.5 text-[14px] font-semibold text-fog">
        {play.away}–{play.home}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------- linescore */

function Linescore({ detail }: { detail: GameDetail }) {
  const [away, home] = detail.teams;
  const columns = Math.max(
    away.linescores.length,
    home.linescores.length,
    detail.regulationPeriods,
  );
  // Everything past the live period hasn't been played, and ESPN reports those
  // as 0 rather than omitting them — so they'd read as scoreless quarters.
  const playedThrough =
    detail.state === "post" ? columns : (detail.period ?? 0);

  const cell = (team: GameTeamDetail, index: number) =>
    index < playedThrough && index < team.linescores.length
      ? String(team.linescores[index])
      : "—";

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="px-2 py-1.5 text-left font-mono text-[12px] tracking-[0.14em] text-mist">
            TEAM
          </th>
          {Array.from({ length: columns }, (_, i) => (
            <th
              key={i}
              className="px-1 py-1.5 text-center font-mono text-[12px] tracking-[0.14em] text-mist"
            >
              {periodLabel(i + 1, detail.regulationPeriods)}
            </th>
          ))}
          <th className="px-2 py-1.5 text-right font-mono text-[12px] tracking-[0.14em] text-fog">
            T
          </th>
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
                  <span className="mono-tabular text-[14.5px] font-bold text-paper">
                    {team.abbr}
                  </span>
                </span>
              </td>
              {Array.from({ length: columns }, (_, i) => (
                <td
                  key={i}
                  className="mono-tabular px-1 py-2 text-center text-[15.5px] text-fog"
                >
                  {cell(team, i)}
                </td>
              ))}
              <td
                className={clsx(
                  "mono-tabular px-2 py-2 text-right text-[18.5px] font-bold",
                  winning ? "text-paper" : "text-mist",
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
  const locale = useLocale();
  const [away, home] = detail.teams;
  const live = detail.state === "in";

  const side = (team: GameTeamDetail, align: "left" | "right") => {
    const other = team === away ? home : away;
    const losing =
      detail.state !== "pre" && (team.score ?? 0) < (other.score ?? 0);
    return (
      <div
        className={clsx(
          "relative flex flex-1 flex-col gap-1.5",
          align === "right" && "items-end text-right",
        )}
      >
        <span className="font-mono text-[11.5px] tracking-[0.16em] text-mist uppercase">
          {team.location}
        </span>
        <span className="font-display text-[18.5px] leading-none font-bold text-paper">
          {team.name}
        </span>
        {team.record && (
          <span className="mono-tabular text-[13px] text-mist">
            {team.record}
          </span>
        )}
        {detail.state !== "pre" && (
          <span
            className={clsx(
              "mono-tabular text-[40px] leading-none font-bold sm:text-[52px]",
              losing ? "text-mist" : "text-paper",
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
      /* Extra room on the right so the home team's city clears the close button. */
      className="relative overflow-hidden px-4 pt-5 pr-14 pb-4 sm:px-6 sm:pr-16"
      style={{
        background: `linear-gradient(100deg, color-mix(in srgb, ${away.accent} 26%, var(--color-ink)) 0%, var(--color-ink) 42%, var(--color-ink) 58%, color-mix(in srgb, ${home.accent} 26%, var(--color-ink)) 100%)`,
      }}
    >
      {/* With the small icon gone these carry the team identity on their own,
          so they are bigger and far less faint than a background wash. */}
      <TeamWatermark
        abbr={away.abbr}
        size={140}
        opacity={0.16}
        bleed={26}
        side="left"
      />
      <TeamWatermark
        abbr={home.abbr}
        size={140}
        opacity={0.16}
        bleed={26}
        side="right"
      />

      <div className="relative flex items-start gap-3">
        {side(away, "left")}
        <div className="flex shrink-0 flex-col items-center gap-2 pt-4">
          <span className="font-mono text-[12px] tracking-[0.18em] text-mist">
            @
          </span>
          {live ? (
            <span className="flex items-center gap-1.5 rounded-full border border-live/35 bg-live/10 px-2 py-1 font-mono text-[12px] tracking-[0.14em] text-live">
              <span className="animate-live-dot h-1.5 w-1.5 rounded-full bg-live" />
              {detail.clock} · {detail.statusDetail.split(" - ")[1] ?? ""}
            </span>
          ) : (
            <span className="rounded-full border border-line bg-abyss-2/70 px-2.5 py-1 text-center font-mono text-[12px] tracking-[0.14em] text-mist">
              {detail.state === "pre"
                ? formatKickoff(detail.kickoff, locale)
                : detail.statusDetail}
            </span>
          )}
        </div>
        {side(home, "right")}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- modal */

/**
 * " · Atlanta, GA" at home; " · München, Deutschland" abroad, where ESPN has no
 * state to give — it used to print "Munich, " with nothing after the comma.
 */
function venuePlace(
  venue: NonNullable<GameDetail["venue"]>,
  lang: Lang,
): string {
  if (!venue.city) return "";
  if (venue.country && venue.country !== "USA") {
    const { city, country } = abroadLabel(
      { city: venue.city, country: venue.country },
      lang,
    );
    return ` · ${city}, ${country}`;
  }
  return venue.state ? ` · ${venue.city}, ${venue.state}` : ` · ${venue.city}`;
}

/**
 * Two ways into a calendar, both built by the server so they carry the German
 * broadcast (see server/src/calendar.ts).
 *
 * ⚠️ **Desktop only, from 1280px up.** Neither route works on Eric's phone:
 * iOS hands a `calendar.google.com` link to the Google Calendar app, which
 * drops the prefilled event and just opens (a redirect and a scripted
 * navigation were both tried — it is the app's behaviour, not something this
 * page can route around), and the `.ics` file lands somewhere Chrome for iOS
 * never surfaces, so the tap reads as having done nothing. A button that
 * silently fails is worse than no button, so on a phone there is no button.
 *
 * The gate is a width, which is a proxy for the real condition and an imperfect
 * one — it is the app's own `DESKTOP_QUERY` breakpoint, so an iPad held in
 * landscape still sees them. Done in CSS rather than with a media-query hook so
 * there is no frame where the buttons exist and then vanish.
 *
 * Whenever this is revisited: the file is the half worth saving, since it is
 * the only one that can reach a calendar on an iPhone at all — through Safari,
 * which turns an inline `text/calendar` into its own "Add to Calendar" sheet.
 */
function CalendarLinks({ gameId, lang }: { gameId: string; lang: Lang }) {
  const t = useStrings();
  // A .ics tap can look like nothing happened — the browser files it away
  // silently. We can't see whether it landed, so say where to look.
  const [fileTapped, setFileTapped] = useState(false);
  const pill =
    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[12px] tracking-[0.08em] transition-colors";
  return (
    <div className="mt-0.5 hidden flex-col gap-2 xl:flex">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/game/${gameId}/calendar.ics?lang=${lang}`}
          onClick={() => setFileTapped(true)}
          className={clsx(
            pill,
            "border-fog/30 bg-ink-2 text-paper hover:border-fog/60",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5" />
          </svg>
          {t.addToCalendar}
        </a>
        <a
          href={`/api/game/${gameId}/google-calendar?lang=${lang}`}
          target="_blank"
          rel="noopener"
          className={clsx(
            pill,
            "border-line text-mist hover:border-fog/40 hover:text-fog",
          )}
        >
          {t.addToGoogleCalendar}
        </a>
      </div>
      <p
        aria-live="polite"
        className="font-display text-[12.5px] leading-snug text-mist"
      >
        {fileTapped ? t.icsHint : ""}
      </p>
    </div>
  );
}

function Body({ detail }: { detail: GameDetail }) {
  const locale = useLocale();
  const { lang } = useSettings().settings;
  const [away, home] = detail.teams;
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useOverflowEdges(scroller);
  const mask = edgeFadeMask(edges, 20);

  if (detail.state === "pre") {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        <Section label="KICKOFF">
          <p className="font-display text-[15.5px] text-fog">
            {formatKickoff(detail.kickoff, locale)}
          </p>
          <CalendarLinks gameId={detail.id} lang={lang} />
        </Section>
        {detail.odds && (
          <Section label="LINE">
            <p className="mono-tabular text-[15.5px] text-fog">{detail.odds}</p>
          </Section>
        )}
        {detail.venue && (
          <Section label="VENUE">
            <p className="font-display text-[15.5px] text-fog">
              {detail.venue.name}
              {venuePlace(detail.venue, lang)}
            </p>
          </Section>
        )}
        <p className="font-display text-[14.5px] leading-relaxed text-mist">
          Quarter scores, scoring plays and team numbers appear here once the
          game kicks off.
        </p>
      </div>
    );
  }

  const periods = Array.from(new Set(detail.scoring.map((p) => p.period))).sort(
    (a, b) => a - b,
  );
  const teamOf = (abbr: string) => detail.teams.find((t) => t.abbr === abbr);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
      <Section label="BY QUARTER">
        <div
          ref={scroller}
          className="no-scrollbar overflow-x-auto"
          style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        >
          <div className="min-w-[320px]">
            <Linescore detail={detail} />
          </div>
        </div>
      </Section>

      {periods.length > 0 && (
        <Disclosure
          label="HOW IT WAS SCORED"
          hint={`${detail.scoring.length} ${detail.scoring.length === 1 ? "SCORE" : "SCORES"}`}
        >
          <div className="flex flex-col gap-3 pt-1">
            {periods.map((period) => {
              const plays = detail.scoring.filter((p) => p.period === period);
              const last = plays[plays.length - 1];
              return (
                <div key={period}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-line-soft pb-1">
                    <span className="font-mono text-[13px] tracking-[0.16em] text-fog">
                      {periodLabel(period, detail.regulationPeriods)}
                    </span>
                    <span className="mono-tabular text-[13px] text-mist">
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
        </Disclosure>
      )}

      {away.leaders.length > 0 && (
        <Disclosure label="STANDOUTS" hint="PASS · RUSH · REC">
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            {detail.teams.map((team) => (
              <div
                key={team.abbr}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-abyss-2/50 p-3"
              >
                <span className="flex items-center gap-2">
                  <TeamLogo abbr={team.abbr} size={18} accent={team.accent} />
                  <span className="mono-tabular text-[14px] font-bold text-paper">
                    {team.abbr}
                  </span>
                </span>
                {team.leaders.map((leader) => (
                  <div key={leader.category} className="flex flex-col">
                    <span className="font-mono text-[11.5px] tracking-[0.14em] text-mist uppercase">
                      {leader.category}
                    </span>
                    <span className="font-display text-[14.5px] text-paper">
                      {leader.athlete}
                    </span>
                    <span className="mono-tabular text-[13.5px] text-mist">
                      {leader.line}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Disclosure>
      )}

      {away.stats.length > 0 && (
        <Disclosure label="TEAM NUMBERS" hint={`${away.stats.length} STATS`}>
          <div className="flex flex-col divide-y divide-line-soft pt-1">
            {away.stats.map((stat, i) => (
              <div
                key={stat.label}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2"
              >
                <span className="mono-tabular text-left text-[15.5px] font-semibold text-paper">
                  {stat.value}
                </span>
                <span className="font-mono text-[12px] tracking-[0.12em] text-mist uppercase">
                  {stat.label}
                </span>
                <span className="mono-tabular text-right text-[15.5px] font-semibold text-paper">
                  {home.stats[i]?.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </Disclosure>
      )}

      {(detail.venue || detail.attendance) && (
        <p className="font-mono text-[12px] tracking-[0.1em] text-mist">
          {detail.venue?.name}
          {detail.venue && venuePlace(detail.venue, lang)}
          {detail.attendance
            ? ` · ${detail.attendance.toLocaleString(locale)} in attendance`
            : ""}
        </p>
      )}
    </div>
  );
}

/**
 * Everything past the quarter scores is detail, and all of it at once is more
 * than anyone wants when a game opens — so it starts folded, with the hint
 * saying what is inside. Uses the same `.drawer` grid-rows trick as the
 * standings row, which animates open without measuring anything.
 */
function Disclosure({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-abyss-2/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-ink-2/50"
      >
        <span className="font-mono text-[12px] tracking-[0.18em] text-fog">
          {label}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[11.5px] tracking-[0.12em] text-mist">
            {hint}
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[15.5px] leading-none text-mist transition-transform duration-200"
            style={{ transform: open ? "rotate(45deg)" : "none" }}
          >
            +
          </span>
        </span>
      </button>
      <div className="drawer" data-open={open}>
        <div>
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[12px] tracking-[0.18em] text-mist">
        {label}
      </h3>
      {children}
    </section>
  );
}

/** Shaped like the loaded modal, so opening one doesn't resize under you. */
function GameSkeleton() {
  const t = useStrings();
  return (
    <div aria-busy="true" aria-label={t.loadingGame}>
      <div className="flex items-start gap-3 px-4 pt-5 pb-4 sm:px-6">
        {[0, 1].map((side) => (
          <div
            key={side}
            className={`flex flex-1 flex-col gap-2 ${side === 1 ? "items-end" : ""}`}
          >
            <Shimmer
              className="h-[52px] w-[52px] rounded-full"
              delay={side * 90}
            />
            <Shimmer className="h-2.5 w-20 rounded" delay={side * 90 + 40} />
            <Shimmer className="h-4 w-28 rounded" delay={side * 90 + 80} />
            <Shimmer
              className="mt-1 h-[44px] w-20 rounded-lg"
              delay={side * 90 + 120}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-2.5 w-24 rounded" />
          <Shimmer className="h-[96px] w-full rounded-lg" delay={80} />
        </div>
        <div className="flex flex-col gap-2">
          <Shimmer className="h-2.5 w-32 rounded" delay={120} />
          {[0, 1, 2, 3].map((i) => (
            <Shimmer
              key={i}
              className="h-[46px] w-full rounded"
              delay={160 + i * 70}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameModal({ gameId, onClose }: GameModalProps) {
  const t = useStrings();
  const dialog = useRef<HTMLDialogElement>(null);
  /** Where a tap on the backdrop began, if it began there. */
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const { detail, loading, error } = useGameDetail(gameId);

  /**
   * A real `<dialog>`, opened with `showModal()`.
   *
   * It was a hand-built overlay for one reason: the top layer is invisible to
   * view transitions, and the dialog used to morph out of the card you tapped.
   * That morph is gone — it broke differently in every engine and cost more
   * than it gave (docs/DECISIONS.md) — and with it every reason to reimplement
   * what the platform already does: the focus trap, Escape, painting above
   * every stacking context, `aria-modal`, and focus handed back to the card on
   * close.
   */
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const root = document.documentElement;
    // Paused, the page underneath is still, so the veil's blur is computed
    // once instead of on every frame the blooms move.
    root.dataset.overlay = "";
    if (!el.open) el.showModal();
    // `showModal()` blocks interaction, not scrolling: iOS would still pan the
    // page behind the dialog.
    const unlock = lockScroll();

    return () => {
      delete root.dataset.overlay;
      unlock();
      if (el.open) el.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="game-dialog"
      aria-label={t.gameDetail}
      // Escape and any native close land here, so the URL follows the dialog.
      onClose={onClose}
      onPointerDown={(event) => {
        // Anywhere outside the panel is the dialog element itself.
        tapStart.current =
          event.target === dialog.current
            ? { x: event.clientX, y: event.clientY }
            : null;
      }}
      onPointerUp={(event) => {
        const start = tapStart.current;
        tapStart.current = null;
        if (!start || event.target !== dialog.current) return;
        if (
          Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          TAP_SLOP
        )
          return;
        onClose();
      }}
      onPointerCancel={() => (tapStart.current = null)}
    >
      {/* The dim and blur. A plain element rather than `::backdrop`, so the
          blur is one thing in one place across engines. */}
      <div className="game-dialog__veil" aria-hidden="true" />

      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="game-dialog__close"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
      </button>

      <div className="game-dialog__panel">
        <div className="game-dialog__scroll">
          {detail ? (
            <>
              <Header detail={detail} />
              <Body detail={detail} />
            </>
          ) : error && !loading ? (
            <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
              <p className="font-mono text-[14px] tracking-[0.14em] text-mist">
                {t.gameFailed}
              </p>
            </div>
          ) : (
            <GameSkeleton />
          )}
        </div>
      </div>
    </dialog>
  );
}
