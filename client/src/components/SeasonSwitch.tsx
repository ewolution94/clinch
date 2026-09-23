import { useStrings } from "../lib/useSettings";

/**
 * Moving between the season being played and the ones that are finished.
 *
 * Two pieces, deliberately far apart on the page. The picker sits in the header
 * where the year is already printed, so it costs no width on a phone — the one
 * row of chrome there is already five tabs wide. The band sits at the top of
 * the content, because a reader who lands on a shared link needs to know
 * *immediately* that this is not the current table, and a small year in the
 * corner is not enough to carry that.
 *
 * It follows the week browser's rule: any view of something other than now says
 * so, and offers the way straight back.
 */

interface SeasonSelectProps {
  /** The year on screen — the live season's, or an archived one. */
  year: number;
  /** The live season's year, which is the option that isn't archived. */
  current: number;
  /** Finished seasons on offer, newest first. */
  archive: number[];
  onChange: (year: number | null) => void;
}

/**
 * A real `<select>`, not a menu of our own.
 *
 * It is the one control here that has to open something on top of everything
 * else, and on iOS the native one is a wheel the reader already knows. A custom
 * dropdown would mean a second overlay in an app whose overlays have been the
 * source of every hard bug in it — for a list of six years.
 *
 * ⚠️ The select is transparent and sits *over* the chip you can see, and its
 * font-size is 16px rather than the 12.5px the chip is drawn at. That is not
 * styling: **iOS zooms the whole page in when a form control smaller than 16px
 * takes focus**, and a zoomed page then pans sideways — which is how a season
 * picker turned into "the page scrolls horizontally and feels very bad". The
 * visible span carries the design; the invisible control carries the font-size
 * iOS insists on. Don't merge them back into one element, and don't fix it with
 * `maximum-scale=1` on the viewport, which buys the same thing by taking pinch
 * zoom away from everyone.
 */
export function SeasonSelect({ year, current, archive, onChange }: SeasonSelectProps) {
  const t = useStrings();
  if (archive.length === 0) return null;

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t.season}</span>
      {/* First in the DOM so the chip below can react to its focus. */}
      <select
        value={year}
        onChange={(event) => {
          const picked = Number(event.target.value);
          onChange(picked === current ? null : picked);
        }}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-[16px] opacity-0"
      >
        <option value={current}>{current}</option>
        {archive.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="mono-tabular pointer-events-none flex items-center gap-1 rounded-md border border-line bg-ink/70 py-0.5 pr-1.5 pl-1.5 text-[12.5px] tracking-[0.08em] text-mist transition-colors peer-hover:border-fog/40 peer-hover:text-paper peer-focus-visible:border-fog/60 peer-focus-visible:text-paper"
      >
        {year}
        <span className="text-[9px]">▼</span>
      </span>
    </label>
  );
}

/**
 * The band above an archived season. Says which year, what is and isn't in it,
 * and gets the reader back to the current table in one tap.
 */
export function ArchiveBand({ year, onLeave }: { year: number; onLeave: () => void }) {
  const t = useStrings();

  return (
    <aside className="flex flex-col gap-2.5 rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="shrink-0 rounded-sm bg-gold/20 px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.16em] text-gold">
          {t.archive}
        </span>
        <p className="font-display text-[14.5px] leading-relaxed text-fog">
          {t.archiveNote.replace("{year}", String(year))}
        </p>
      </div>
      <button
        type="button"
        onClick={onLeave}
        className="shrink-0 self-start rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 font-mono text-[11.5px] tracking-[0.12em] whitespace-nowrap text-gold transition-colors hover:bg-gold/20 sm:self-auto"
      >
        {t.backToCurrent}
      </button>
    </aside>
  );
}
