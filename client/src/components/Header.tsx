import { Fragment } from "react";
import { clsx } from "clsx";
import { useStrings } from "../lib/useSettings";
import { ClinchMark } from "./ClinchMark";
import type { Route } from "../hooks/useRoute";
import type { ConnectionState, Snapshot } from "../lib/types";

interface HeaderProps {
  snapshot: Snapshot | null;
  connection: ConnectionState;
  route: Route;
  onRoute: (route: Route) => void;
}

// Where the season is now, then where it's heading. Labels come from the string
// table so the order lives here and the wording lives there.
const TAB_IDS: Route[] = ["standings", "week", "playoffs", "bracket", "settings"];

export function Header({
  snapshot,
  connection,
  route,
  onRoute,
}: HeaderProps) {
  const t = useStrings();
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
    { id: "settings" as const, label: t.settings, short: t.routeSettings },
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
          {/* Full width on a phone, each tab an equal share: five labels fit a
              360px screen only with the cog gone and the side padding tight.
              From sm up the tabs size to their text again. */}
          <nav
            className="flex w-full rounded-full border border-line bg-ink/70 p-0.5 sm:w-auto"
            aria-label={t.views}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onRoute(tab.id)}
                aria-current={route === tab.id ? "page" : undefined}
                className={clsx(
                  "flex-1 rounded-full px-1.5 py-1.5 font-display text-[15.5px] font-medium whitespace-nowrap transition-colors sm:flex-none sm:px-5",
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

        </div>

        <div className="h-px w-full bg-line/60">
          <div
            className="h-px bg-gradient-to-r from-brand/70 to-gold/70 transition-[width] duration-700"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
    </>
  );
}
