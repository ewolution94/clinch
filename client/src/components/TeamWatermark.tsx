import { logoUrl } from "../lib/format";

interface TeamWatermarkProps {
  abbr: string;
  size: number;
  className: string;
}

/**
 * The oversized, faded team mark that turns a card into a team banner. Kept
 * separate from TeamLogo because that one sets `relative` on itself, and
 * Tailwind emits `.relative` after `.absolute` — so a positioning class passed
 * in from outside would silently lose and leave this in the layout flow.
 */
export function TeamWatermark({ abbr, size, className }: TeamWatermarkProps) {
  return (
    <img
      src={logoUrl(abbr)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
