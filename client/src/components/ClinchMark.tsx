interface ClinchMarkProps {
  size?: number;
  className?: string;
}

/**
 * Two bracket arms closing on a single point — a playoff bracket narrowing to
 * one team, and the act the whole app is named for. Chevrons rather than a
 * literal bracket because they still read at 16px in a browser tab.
 *
 * The app icon's drawing (development/plans/app-icons, 1024 grid), cropped to
 * the mark; in the app the arms keep their orange and the point its gold.
 */
export function ClinchMark({ size = 32, className }: ClinchMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="192 192 640 640"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="clinch-arm" x1="0" y1="286" x2="0" y2="738" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff9a52" />
          <stop offset="1" stopColor="#f8520a" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#clinch-arm)"
        strokeWidth="80"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M236 286 L384 512 L236 738" />
        <path d="M788 286 L640 512 L788 738" />
      </g>
      <circle cx="512" cy="512" r="60" fill="#ffc53d" />
    </svg>
  );
}
