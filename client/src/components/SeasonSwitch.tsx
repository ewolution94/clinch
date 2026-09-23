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
 */
export function SeasonSelect({ year, current, archive, onChange }: SeasonSelectProps) {
  const t = useStrings();
  if (archive.length === 0) return null;

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{t.season}</span>
      <select
        value={year}
        onChange={(event) => {
          const picked = Number(event.target.value);
          onChange(picked === current ? null : picked);
        }}
        className="mono-tabular cursor-pointer appearance-none rounded-md border border-line bg-ink/70 py-0.5 pr-5 pl-1.5 text-[12.5px] tracking-[0.08em] text-mist transition-colors hover:border-fog/40 hover:text-paper focus-visible:border-fog/40"
      >
        <option value={current}>{current}</option>
        {archive.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
      {/* The select's own arrow is suppressed above so the control can match
          the rest of the chrome; this is the replacement. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 text-[9px] text-mist"
      >
        ▼
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
