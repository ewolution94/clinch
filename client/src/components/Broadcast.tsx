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
import { useStrings } from "../lib/useSettings";

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
    const earliest = broadcast.slots.map((s) => s.startsAt).sort()[0];
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
  filter,
  className,
}: {
  broadcasts: WeekBroadcasts | undefined;
  /** "Only games on TV". Absent where there is nothing to filter by. */
  filter?: { on: boolean; set: (on: boolean) => void };
  className?: string;
}) {
  const t = useStrings();
  if (!broadcasts || broadcasts.upcoming === 0) return null;

  const { published, confirmed, candidates, upcoming, outlets } = broadcasts;
  const where = outlets.join(` ${t.or} `);

  const body = !published ? (
    <span className="text-mist">{t.listingsNotOut}</span>
  ) : (
    <>
      <span className="mono-tabular font-semibold text-jade">{confirmed}</span>
      <span className="text-fog">
        {" "}
        {(upcoming === 1 ? t.ofGameOn : t.ofGamesOn)
          .replace("{total}", String(upcoming))
          .replace("{where}", where)}
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
          {t.moreCouldBe.replace("{n}", String(candidates))}
        </p>
      )}
      {filter && (
        <div
          role="radiogroup"
          aria-label={t.filterTv}
          className="mt-1.5 flex gap-1 rounded-full border border-line bg-abyss-2/70 p-0.5"
        >
          {[
            { on: false, label: t.filterAll },
            { on: true, label: t.filterTv },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={filter.on === option.on}
              onClick={() => filter.set(option.on)}
              className={clsx(
                "rounded-full px-3 py-1 font-mono text-[11.5px] tracking-[0.08em] whitespace-nowrap transition-colors",
                filter.on === option.on
                  ? "bg-paper text-abyss"
                  : "text-mist hover:text-fog",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
