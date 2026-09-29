import { Fragment, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { edgeFadeMask, useOverflowEdges } from "../hooks/useOverflowEdges";
import { useStrings } from "../lib/useSettings";
import { ClinchMark } from "./ClinchMark";
import { SeasonSelect } from "./SeasonSwitch";
import type { Route } from "../hooks/useRoute";
import type { Strings } from "../lib/strings";
import type { ConnectionState, Snapshot } from "../lib/types";

/**
 * "There is more this way."
 *
 * The edge fade on its own is not a reliable cue, and the reason is worth
 * writing down: an inactive tab has no background, only text. So the fade has
 * something to act on only when the scroller's edge happens to land on a word.
 * Land it in the ~28px of padding between two labels — which is exactly what
 * happens at some viewport widths and no others — and the mask fades nothing
 * at all, leaving a bar that looks like it ends there.
 *
 * A chevron is painted whatever is underneath it, so it does not care where
 * the edge falls. It crossfades on the same state the mask uses, so the two
 * always agree, and it is `aria-hidden` because the tabs are already reachable
 * by keyboard and a screen reader has no edge to be stuck at.
 */
function ScrollCue({ side, shown }: { side: "start" | "end"; shown: boolean }) {
  const start = side === "start";
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-y-0 flex w-7 items-center justify-center text-mist transition-opacity duration-300 ease-out",
        start ? "left-0" : "right-0",
        shown ? "opacity-100" : "opacity-0",
      )}
    >
      <svg
        width="7"
        height="12"
        viewBox="0 0 7 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={start ? "M6 1 1 6l5 5" : "M1 1l5 5-5 5"} />
      </svg>
    </span>
  );
}

interface HeaderProps {
  snapshot: Snapshot | null;
  connection: ConnectionState;
  route: Route;
  onRoute: (route: Route) => void;
  /** Null for the live season; a year while an archived one is being read. */
  onSeason: (year: number | null) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Where the season is now, then where it's heading.
 *
 * One label per view at every width — no short phone variant. The labels say
 * what the view is ("Week Schedule", not "Week"), and when six of them don't
 * fit a phone the bar scrolls sideways instead of the words getting shorter.
 * Fitting an arbitrary 360px was what made them cryptic in the first place.
 */
const TABS: { id: Route; label: (t: Strings) => string }[] = [
  { id: "standings", label: (t) => t.routeStandings },
  { id: "week", label: (t) => t.routeWeek },
  { id: "team", label: (t) => t.routeTeam },
  { id: "playoffs", label: (t) => t.routePlayoffs },
  { id: "bracket", label: (t) => t.routeBracket },
  { id: "settings", label: (t) => t.settings },
];

export function Header({
  snapshot,
  connection,
  route,
  onRoute,
  onSeason,
  onRefresh,
  refreshing,
}: HeaderProps) {
  const t = useStrings();
  const nav = useRef<HTMLElement>(null);
  const edges = useOverflowEdges(nav);
  // Wide enough that the chevron sitting in it has properly faded labels to
  // sit on rather than half a word.
  const mask = edgeFadeMask(edges, 30);

  /*
   * Bring the current view into view.
   *
   * Only when it isn't already: tapping a tab you can see shouldn't slide the
   * bar out from under your finger. What this is for is arriving — a reload on
   * `/settings`, a shared link, the back gesture — where the active tab can sit
   * off the right-hand edge of a phone with nothing to say so.
   */
  useEffect(() => {
    const bar = nav.current;
    const active = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left >= bar.scrollLeft && right <= bar.scrollLeft + bar.clientWidth)
      return;
    // Centred rather than just-in-view, so the neighbours on both sides show
    // and the row reads as a row rather than as an edge.
    bar.scrollTo({
      left: Math.max(0, left - (bar.clientWidth - active.offsetWidth) / 2),
      behavior: "instant" as ScrollBehavior,
    });
  }, [route]);

  const live = snapshot?.live ?? false;
  const archived = snapshot?.archived ?? false;
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
            <div className="flex items-center gap-2">
              {/*
                An installed app has no pull-to-refresh — there is no browser
                chrome to pull against — so the way to ask for fresh data has to
                be on the page. Next to the sync pill, because that is where a
                reader already looks to find out how current this is. Hidden on
                an archived season, which cannot change.
              */}
              {!archived && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label={refreshing ? t.refreshing : t.refresh}
                  title={refreshing ? t.refreshing : t.refresh}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-ink/60 text-mist transition-colors hover:border-fog/40 hover:text-paper disabled:opacity-60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={clsx(refreshing && "animate-spin")}
                  >
                    <path d="M20 11a8 8 0 1 0-.6 4" />
                    <path d="M20 4v7h-7" />
                  </svg>
                </button>
              )}
            {archived ? (
              <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[13px] tracking-[0.15em] text-gold">
                {t.archive}
              </span>
            ) : live ? (
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
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[12.5px] tracking-[0.12em] whitespace-nowrap text-mist">
              {weekLabel.toUpperCase()}
              {snapshot && (
                <>
                  <span aria-hidden="true">·</span>
                  <SeasonSelect
                    year={snapshot.season.year}
                    current={snapshot.currentSeason}
                    archive={snapshot.archiveSeasons}
                    onChange={onSeason}
                  />
                </>
              )}
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
          {/*
            The frame and the scroller are two elements on purpose.

            The border has to stay put and stay crisp while the labels move
            under it, and the edge fade has to dim the labels without dimming
            the border — one element can't do both. The outer box also has no
            overflow of its own, which keeps it out of the scrolling chain.
          */}
          <div className="relative min-w-0 rounded-full border border-line bg-ink/70 p-0.5">
            <nav
              ref={nav}
              className="no-scrollbar flex overflow-x-auto [contain:paint]"
              style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
              aria-label={t.views}
            >
              {/*
                ⚠️ `contain: paint` above, for the reason the week strip needs
                it: without it this row's scrollable overflow — six full labels,
                roughly 640px — counts towards the document's own, and the whole
                page can be dragged sideways. See docs/DECISIONS.md.
              */}
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onRoute(tab.id)}
                  aria-current={route === tab.id ? "page" : undefined}
                  className={clsx(
                    "shrink-0 rounded-full px-3.5 py-1.5 font-display text-[15.5px] font-medium whitespace-nowrap transition-colors sm:px-5",
                    route === tab.id
                      ? "bg-paper text-abyss"
                      : "text-mist hover:text-fog",
                  )}
                >
                  {tab.label(t)}
                </button>
              ))}
            </nav>

            {/*
              Siblings of the scroller, not children, so the mask doesn't erase
              the very thing that says there is more to see.
            */}
            <ScrollCue side="start" shown={edges.start} />
            <ScrollCue side="end" shown={edges.end} />
          </div>
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
