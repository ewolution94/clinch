import { RESULT_COLOR } from "../lib/status";
import type { GameResult } from "../lib/types";
import { useStrings } from "../lib/useSettings";

interface FormDotsProps {
  form: GameResult[];
  /** Pads to a fixed length so columns line up across rows. */
  slots?: number;
}

/**
 * Oldest on the left, newest on the right. Every result is drawn at full
 * strength — an earlier version faded the older ones to hint at recency, which
 * turned a faded loss into something that read as a tie. The row's streak
 * column says what the latest run is.
 */
export function FormDots({ form, slots = 5 }: FormDotsProps) {
  const t = useStrings();
  const padding = Math.max(0, slots - form.length);

  return (
    <span
      className="flex items-center gap-1"
      title={
        form.length
          ? `${t.lastN.replace("{n}", String(form.length))}: ${form.join(" ")}`
          : t.noGamesPlayed
      }
    >
      {/* A game not yet played is an empty ring, so it can't be mistaken for a
          tie, which is a filled grey dot. */}
      {Array.from({ length: padding }, (_, i) => (
        <span
          key={`pad-${i}`}
          className="h-2 w-2 rounded-full border border-mist/40"
        />
      ))}
      {form.map((result, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ background: RESULT_COLOR[result] }}
        />
      ))}
    </span>
  );
}
