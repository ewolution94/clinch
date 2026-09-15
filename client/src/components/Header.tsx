import { clsx } from "clsx";
import { ClinchMark } from "./ClinchMark";
import type { Route } from "../hooks/useRoute";
import type { ConnectionState, Snapshot } from "../lib/types";

interface HeaderProps {
  snapshot: Snapshot | null;
  connection: ConnectionState;
  route: Route;
  onRoute: (route: Route) => void;
}

const TABS: { id: Route; label: string; short: string }[] = [
  { id: "standings", label: "Standings", short: "Table" },
  { id: "playoffs", label: "Playoff picture", short: "Picture" },
  { id: "bracket", label: "Bracket", short: "Bracket" },
];

export function Header({ snapshot, connection, route, onRoute }: HeaderProps) {
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
              WHO&apos;S IN, WHO&apos;S OUT
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {live ? (
            <span className="flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-2.5 py-1 font-mono text-[13px] tracking-[0.15em] text-live">
              <span className="animate-live-dot h-1.5 w-1.5 rounded-full bg-live" />
              LIVE
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
            aria-label="Views"
          >
            {TABS.map((tab) => (
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
