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
  onOpenSettings: () => void;
}

// Where the season is now, then where it's heading. Labels come from the string
// table so the order lives here and the wording lives there.
const TAB_IDS: Route[] = ["standings", "week", "playoffs", "bracket"];

export function Header({
  snapshot,
  connection,
  route,
  onRoute,
  onOpenSettings,
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
  ].sort((a, b) => TAB_IDS.indexOf(a.id) - TAB_IDS.indexOf(b.id));
  const live = snapshot?.live ?? false;
  const weekLabel = snapshot ? snapshot.week.label : "Loading";
  const progress =
    snapshot && snapshot.week.number > 0
      ? snapshot.week.number / snapshot.week.total
      : 0;

  return (
    <header>
      <div className="mx-auto flex max-w-[1800px] items-start justify-between gap-4 px-4 pt-6 pb-5 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <ClinchMark size={38} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-[-0.02em] text-paper">
              CLINCH
            </span>
            <span className="mt-1 font-mono text-[11px] tracking-[0.16em] whitespace-nowrap text-mist sm:text-[12.5px] sm:tracking-[0.2em]">
              {t.tagline}
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

      {/* Only the controls stick — the wordmark scrolls away and gives the
          standings the full height of a phone screen. */}
      <div className="sticky top-0 z-30 border-b border-line/70 bg-abyss/85 backdrop-blur-xl">
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
            onClick={onOpenSettings}
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
            >
              <circle
                cx="12"
                cy="12"
                r="3.2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
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
    </header>
  );
}
