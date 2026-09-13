import type { GameResult } from "../lib/types";

const RESULT_COLOR: Record<GameResult, string> = {
  W: "var(--color-jade)",
  L: "var(--color-live)",
  T: "var(--color-mist)",
};

interface FormDotsProps {
  form: GameResult[];
  /** Pads to a fixed length so columns line up across rows. */
  slots?: number;
}

export function FormDots({ form, slots = 5 }: FormDotsProps) {
  const padding = Math.max(0, slots - form.length);

  return (
    <span className="flex items-center gap-[3px]" title={form.length ? `Last ${form.length}: ${form.join(" ")}` : "No games played"}>
      {Array.from({ length: padding }, (_, i) => (
        <span key={`pad-${i}`} className="h-[5px] w-[5px] rounded-full bg-line" />
      ))}
      {form.map((result, i) => (
        <span
          key={i}
          className="h-[5px] w-[5px] rounded-full"
          style={{ background: RESULT_COLOR[result], opacity: 0.55 + (i / Math.max(1, form.length - 1)) * 0.45 }}
        />
      ))}
    </span>
  );
}
