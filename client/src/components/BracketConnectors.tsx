interface BracketConnectorsProps {
  /** Matches feeding in from the previous round. */
  incoming: number;
  /** "right" for the AFC half, "left" for the mirrored NFC half. */
  flow: "left" | "right";
  /**
   * Accent colour per incoming match, in the same top-to-bottom order — the
   * team travelling along that arm. Null leaves the arm unlit.
   */
  arms?: (string | null | undefined)[];
}

const DIM = "color-mix(in srgb, var(--color-mist) 38%, transparent)";

/**
 * The elbows between two rounds, drawn in a stretched 100×100 viewBox.
 *
 * Each round column distributes its matches with `flex-1`, so match i sits at
 * (i + 0.5) / n of the column height — the same fraction in any column, at any
 * size. That makes the joins pure arithmetic instead of something measured in
 * JS and re-measured on every resize. `preserveAspectRatio="none"` lets the
 * box stretch; `vector-effect` keeps the strokes hairlines while it does.
 */
export function BracketConnectors({ incoming, flow, arms = [] }: BracketConnectorsProps) {
  const outgoing = Math.max(1, Math.floor(incoming / 2));
  const mirrored = flow === "left";
  const near = mirrored ? 100 : 0;
  const mid = 50;
  const far = mirrored ? 0 : 100;

  const segments: { d: string; stroke: string; lit: boolean }[] = [];

  if (incoming === 1) {
    const accent = arms[0];
    segments.push({ d: `M${near} 50 H${far}`, stroke: accent ?? DIM, lit: Boolean(accent) });
  } else {
    for (let j = 0; j < outgoing; j++) {
      const top = ((2 * j + 0.5) / incoming) * 100;
      const bottom = ((2 * j + 1.5) / incoming) * 100;
      const centre = ((j + 0.5) / outgoing) * 100;
      const topAccent = arms[2 * j];
      const bottomAccent = arms[2 * j + 1];

      segments.push({ d: `M${near} ${top} H${mid}`, stroke: topAccent ?? DIM, lit: Boolean(topAccent) });
      segments.push({ d: `M${near} ${bottom} H${mid}`, stroke: bottomAccent ?? DIM, lit: Boolean(bottomAccent) });
      segments.push({ d: `M${mid} ${top} V${bottom}`, stroke: DIM, lit: false });
      segments.push({ d: `M${mid} ${centre} H${far}`, stroke: DIM, lit: false });
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {segments.map((segment, i) => (
        <path
          key={i}
          d={segment.d}
          fill="none"
          stroke={segment.stroke}
          strokeWidth={segment.lit ? 1.5 : 1}
          strokeLinecap="round"
          opacity={segment.lit ? 0.9 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
