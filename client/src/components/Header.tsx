import { Fragment, useCallback, useState } from "react";
import { clsx } from "clsx";
import { useStrings } from "../lib/useSettings";
import { ClinchMark } from "./ClinchMark";
import { SettingsDialog } from "./SettingsDialog";
import type { Route } from "../hooks/useRoute";
import type { ConferenceView, ConnectionState, Snapshot } from "../lib/types";

interface HeaderProps {
  snapshot: Snapshot | null;
  connection: ConnectionState;
  route: Route;
  onRoute: (route: Route) => void;
}

// Where the season is now, then where it's heading. Labels come from the string
// table so the order lives here and the wording lives there.
const TAB_IDS: Route[] = ["standings", "week", "playoffs", "bracket"];
const NO_CONFERENCES: ConferenceView[] = [];

export function Header({
  snapshot,
  connection,
  route,
  onRoute,
}: HeaderProps) {
  const t = useStrings();
  // Held here rather than in App: opening the sheet then re-renders the header
  // and the sheet, not every card on the page behind it.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const tabs = [
    {
      id: "standings" as const,
      label: t.routeStandingsLong,
      short: t.routeStandings,
    },
    { id: "week" as const, label: t.routeWeekLong, short: t.routeWeek },
    {
      id: "playoffs" as const,
      label: t.routePlayoffsLong,
      short: t.routePlayoffs,
    },
    {
      id: "bracket" as const,
      label: t.routeBracketLong,
      short: t.routeBracket,
    },
  ].sort((a, b) => TAB_IDS.indexOf(a.id) - TAB_IDS.indexOf(b.id));
  const live = snapshot?.live ?? false;
  const weekLabel = snapshot ? snapshot.week.label : "Loading";
  const progress =
    snapshot && snapshot.week.number > 0
      ? snapshot.week.number / snapshot.week.total
      : 0;

  return (
    <>
      <header>
        <div className="mx-auto flex max-w-[1800px] items-start justify-between gap-4 px-4 pt-6 pb-5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <ClinchMark size={38} />
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-[-0.02em] text-paper">
                CLINCH
              </span>
              {/* German runs 30 characters to English's 18 and pushed the sync
                  pill off a phone screen. Each half is unbreakable, so when the
                  line has to give, it wraps at the comma and nowhere else. */}
              <span className="mt-0.5 font-mono text-[11px] leading-[1.3] tracking-[0.16em] text-mist sm:text-[12.5px] sm:tracking-[0.2em]">
                {t.tagline.split(", ").map((part, i, parts) => (
                  <Fragment key={part}>
                    {i > 0 && " "}
                    <span className="whitespace-nowrap">
                      {i < parts.length - 1 ? `${part},` : part}
                    </span>
                  </Fragment>
                ))}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {live ? (
              <span className="flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-2.5 py-1 font-mono text-[13px] tracking-[0.15em] text-live">
                <span className="animate-live-dot h-1.5 w-1.5 rounded-full bg-live" />
                {t.live}
              </span>
            ) : (
              <span
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[13px] tracking-[0.15em]",
                  connection === "live"
                    ? "border-line bg-ink/60 text-mist"
                    : "border-line bg-ink/60 text-mist opacity-70",
                )}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    connection === "live"
                      ? "bg-jade"
                      : connection === "connecting"
                        ? "bg-mist"
                        : "bg-live",
                  )}
                />
                {connection === "live"
                  ? "SYNCED"
                  : connection === "connecting"
                    ? "SYNCING"
                    : "OFFLINE"}
              </span>
            )}
            <span className="font-mono text-[12.5px] tracking-[0.12em] whitespace-nowrap text-mist">
              {weekLabel.toUpperCase()}
              {snapshot ? ` · ${snapshot.season.year}` : ""}
            </span>
          </div>
        </div>
      </header>

      {/*
        Only the controls stick — the wordmark scrolls away and gives the
        standings the full height of a phone screen.

        The bar is a *sibling* of <header>, not its child, and that is the whole
        fix. A sticky element can't leave its parent's box, and <header> is only
        as tall as the wordmark plus this bar (164px) — so inside it, the bar
        had nowhere to stick to and scrolled away with the logo, tabs and cog
        included. Measured before the move: bar top 100 / 40 / −50 / −300 / −800
        at scroll 0 / 60 / 150 / 400 / 900. Its parent is now the page itself.
      */}
      <div className="clinch-bar sticky top-0 z-30 border-b border-line/70 bg-abyss/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center px-4 py-2.5 sm:px-6 lg:px-10">
          <nav
            className="flex rounded-full border border-line bg-ink/70 p-0.5"
            aria-label={t.views}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onRoute(tab.id)}
                aria-current={route === tab.id ? "page" : undefined}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-display text-[15.5px] font-medium transition-colors sm:px-5",
                  route === tab.id
                    ? "bg-paper text-abyss"
                    : "text-mist hover:text-fog",
                )}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t.settings}
            title={t.settings}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-ink/70 text-mist transition-colors hover:border-fog/40 hover:text-paper"
          >
            {/* Inline rather than an icon package — the app ships none, and the
                page makes no third-party requests. */}
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3.1" />
              <path d="M19.4 14.4a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.75 2.75l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 0 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.75-2.75l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.94 1.94 0 0 1 0-3.88h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 1 1 2.75-2.75l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.94 1.94 0 0 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.75 2.75l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 0 1 0 3.88h-.09a1.6 1.6 0 0 0-1.47.97Z" />
            </svg>
          </button>
        </div>

        <div className="h-px w-full bg-line/60">
          <div
            className="h-px bg-gradient-to-r from-brand/70 to-gold/70 transition-[width] duration-700"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>

      {/* After the bar, not inside it: the bar's backdrop-filter would make it
          the containing block for this `fixed` overlay. */}
      <SettingsDialog
        open={settingsOpen}
        onClose={closeSettings}
        conferences={snapshot?.conferences ?? NO_CONFERENCES}
      />
    </>
  );
}
