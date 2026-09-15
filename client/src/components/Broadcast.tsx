/**
 * "Can I actually watch this?", answered on the card.
 *
 * Three visible states, because that is how many true answers there are. A game
 * is shown on an outlet you have; a game sits in a slot whose matchup RTL has
 * not picked yet; or there is nothing to say. The third case stays silent —
 * sixteen "not on TV" labels would drown the four that matter, and the band at
 * the top of the week already accounts for the whole set.
 */
import { clsx } from "clsx";

import type { GameBroadcast, WeekBroadcasts } from "../lib/types";

function startLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BroadcastBadge({
  broadcast,
}: {
  broadcast: GameBroadcast | undefined;
}) {
  if (!broadcast) return null;

  if (broadcast.status === "confirmed" && broadcast.slots.length > 0) {
    const outlets = [...new Set(broadcast.slots.map((s) => s.outlet))];
    // The programme starts before kickoff for the pregame, so the time on the
    // badge is when to turn it on — which is not the time already on the card.
    const earliest = broadcast.slots
      .map((s) => s.startsAt)
      .sort()[0];
    return (
      <span
        className="ml-auto flex h-[19px] shrink-0 items-center gap-1.5 rounded-full border border-jade/35 bg-jade/12 px-2 leading-none"
        title={`Live on ${outlets.join(" and ")} from ${startLabel(earliest)}`}
      >
        <span className="h-1 w-1 shrink-0 rounded-full bg-jade" />
        <span className="mono-tabular text-[11px] font-semibold tracking-[0.08em] text-jade">
          {outlets.join(" · ")}
        </span>
      </span>
    );
  }

  if (broadcast.status === "candidate") {
    return (
      <span
        className="ml-auto flex h-[19px] shrink-0 items-center rounded-full border border-dashed border-fog/25 px-2 leading-none"
        title={
          broadcast.contenders
            ? `${broadcast.pendingOutlet ?? "RTL"} shows one of ${broadcast.contenders} games in this slot — not announced yet`
            : undefined
        }
      >
        <span className="mono-tabular text-[11px] tracking-[0.08em] text-mist">
          {broadcast.pendingOutlet ?? "RTL"}
          <span className="opacity-70"> ?</span>
        </span>
      </span>
    );
  }

  return null;
}

/**
 * The week in one line. Counts the answer rather than making the reader scan
 * sixteen cards for four badges, and says plainly when the reason a week looks
 * empty is that nobody has published it yet.
 */
export function BroadcastBand({
  broadcasts,
  className,
}: {
  broadcasts: WeekBroadcasts | undefined;
  className?: string;
}) {
  if (!broadcasts || broadcasts.upcoming === 0) return null;

  const { published, confirmed, candidates, upcoming, outlets } = broadcasts;
  const where = outlets.join(" or ");

  const body = !published ? (
    <span className="text-mist">
      German listings for this week aren’t published yet
    </span>
  ) : (
    <>
      <span className="mono-tabular font-semibold text-jade">{confirmed}</span>
      <span className="text-fog">
        {" "}
        of {upcoming} {upcoming === 1 ? "game" : "games"} on {where}
      </span>
    </>
  );

  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-0.5 rounded-xl border border-line bg-ink/40 px-3 py-2 text-center",
        className,
      )}
    >
      <p className="font-display text-[13px] leading-tight">{body}</p>
      {published && candidates > 0 && (
        <p className="font-display text-[12px] leading-tight text-mist">
          {candidates} more could be — RTL names its Sunday picks about a week
          ahead
        </p>
      )}
    </div>
  );
}
