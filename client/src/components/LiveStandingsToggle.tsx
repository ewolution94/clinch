import { clsx } from "clsx";
import { useStrings } from "../lib/useSettings";

/**
 * The switch that folds games in progress into the table.
 *
 * It only exists while something is being played — there is nothing to apply on
 * a Wednesday, and a dead control that does nothing six days a week is worse
 * than no control. So it appears on a Sunday evening and is gone by Tuesday.
 *
 * When it is on, the note below it is not decoration. The table is showing
 * results nobody has finished playing, and the one thing this cannot do is the
 * NFL's tiebreakers — so teams that come out level are left in the order they
 * already had, and that order could really go the other way. Saying so is the
 * price of showing it at all.
 */
export function LiveStandingsToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const t = useStrings();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className={clsx(
          "flex items-center gap-2 self-start rounded-full border px-3 py-1.5 font-mono text-[12px] tracking-[0.1em] transition-colors",
          on
            ? "border-live/45 bg-live/12 text-live"
            : "border-line bg-ink/60 text-mist hover:border-fog/40 hover:text-fog",
        )}
      >
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            on ? "animate-live-dot bg-live" : "bg-mist",
          )}
        />
        {on ? t.liveScoresOn : t.applyLiveScores}
      </button>
      {on && (
        <p className="font-display text-[13px] leading-snug text-mist">
          {t.liveScoresNote}
        </p>
      )}
    </div>
  );
}
