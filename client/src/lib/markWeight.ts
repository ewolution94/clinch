/**
 * Per-mark watermark weight. GENERATED — do not edit by hand.
 *
 *     python3 scripts/measure-marks.py
 *
 * Drawn at one fixed opacity the 32 marks differ by 10.7x in how much of their
 * tile they fill, so the Steelers shout and the Panthers vanish. Each asset is
 * measured once and corrected here: `alpha` trims the heavy marks back, and
 * `brightness` gives the faintest a gentle lift. Both stay mild on purpose —
 * this is the real artwork, in its own colours, not a silhouette.
 *
 * Measured spread after correction: 1.68x. See scripts/measure-marks.py
 * for why the measure is "ink" rather than relative luminance.
 */
export interface MarkWeight {
  /** CSS brightness() multiplier. 1 leaves the artwork untouched. */
  brightness: number;
  /** Multiplier on the context's requested opacity. */
  alpha: number;
}

export const MARK_WEIGHT: Record<string, MarkWeight> = {
  ARI: { brightness: 1.06, alpha: 1.09 },
  ATL: { brightness: 1.0, alpha: 0.99 },
  BAL: { brightness: 1.08, alpha: 1.13 },
  BUF: { brightness: 1.02, alpha: 1.03 },
  CAR: { brightness: 1.68, alpha: 1.9 },
  CHI: { brightness: 1.04, alpha: 1.06 },
  CIN: { brightness: 1.0, alpha: 0.82 },
  CLE: { brightness: 1.0, alpha: 0.71 },
  DAL: { brightness: 1.14, alpha: 1.22 },
  DEN: { brightness: 1.0, alpha: 0.93 },
  DET: { brightness: 1.0, alpha: 0.88 },
  GB: { brightness: 1.0, alpha: 0.75 },
  HOU: { brightness: 1.02, alpha: 1.02 },
  IND: { brightness: 1.0, alpha: 1.0 },
  JAX: { brightness: 1.01, alpha: 1.02 },
  KC: { brightness: 1.0, alpha: 0.67 },
  LAC: { brightness: 1.03, alpha: 1.04 },
  LAR: { brightness: 1.23, alpha: 1.35 },
  LV: { brightness: 1.0, alpha: 0.93 },
  MIA: { brightness: 1.0, alpha: 0.76 },
  MIN: { brightness: 1.0, alpha: 0.86 },
  NE: { brightness: 1.07, alpha: 1.11 },
  NO: { brightness: 1.05, alpha: 1.07 },
  NYG: { brightness: 1.3, alpha: 1.47 },
  NYJ: { brightness: 1.62, alpha: 1.9 },
  PHI: { brightness: 1.0, alpha: 0.9 },
  PIT: { brightness: 1.0, alpha: 0.5 },
  SEA: { brightness: 1.0, alpha: 0.96 },
  SF: { brightness: 1.0, alpha: 1.0 },
  TB: { brightness: 1.04, alpha: 1.06 },
  TEN: { brightness: 1.0, alpha: 0.54 },
  WSH: { brightness: 1.09, alpha: 1.14 },
};

/** Teams we have no measurement for fall back to the artwork as authored. */
export const DEFAULT_MARK_WEIGHT: MarkWeight = { brightness: 1, alpha: 1 };
