/**
 * Two small markers that sit on a card or row without adding a column: the
 * reader's favourite team, and a game played outside the US.
 */
import { abroadLabel } from "../lib/abroad";
import { useSettings, useStrings } from "../lib/useSettings";
import type { GameAbroad } from "../lib/types";

/**
 * Drawn in the team's own colour rather than gold — gold already means
 * "division leader" on the playoff picture, and a favourite isn't a status.
 */
export function FavouriteStar({
  accent,
  size = 12,
}: {
  accent: string | undefined;
  size?: number;
}) {
  const t = useStrings();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={t.favouriteTeam}
      className="shrink-0"
      style={{ color: accent ?? "var(--color-fog)" }}
    >
      <path
        fill="currentColor"
        d="M12 2.4l2.93 6.1 6.67.82-4.93 4.58 1.28 6.6L12 17.24 6.05 20.5l1.28-6.6L2.4 9.32l6.67-.82z"
      />
    </svg>
  );
}

/** Flag and city — "🇩🇪 München". `compact` is the flag alone, for the narrow strip. */
export function AbroadBadge({
  abroad,
  compact = false,
}: {
  abroad: GameAbroad | undefined;
  compact?: boolean;
}) {
  const { settings } = useSettings();
  if (!abroad) return null;
  const { flag, city, country } = abroadLabel(abroad, settings.lang);
  if (compact && !flag) return null;

  return (
    <span
      className="flex h-[19px] shrink-0 items-center gap-1 rounded-full border border-line px-1.5 leading-none"
      title={`${city}, ${country}`}
    >
      {/*
       * The flag and the city sit on a shared *baseline*, not on a shared box
       * centre. A flag emoji and the mono face put their ink in very different
       * places within a line box — the emoji's is about 16px tall inside an
       * 11px box — so centring the two boxes leaves the flag visibly off
       * against the text beside it, and by a different amount on each engine.
       * Measured: relative to the baseline both inks are centred at the same
       * offset (-4.0px at 11px), so aligning the baselines aligns the ink, and
       * does it without a per-platform nudge. The pill itself stays centred in
       * its row, and 19px tall to match the broadcast badge next to it.
       */}
      <span className="flex items-baseline gap-1">
        {flag && (
          <span aria-hidden="true" className="text-[11px]">
            {flag}
          </span>
        )}
        {compact ? (
          <span className="sr-only">{city}</span>
        ) : (
          <span className="mono-tabular text-[11px] tracking-[0.06em] text-fog uppercase">
            {city}
          </span>
        )}
      </span>
    </span>
  );
}
