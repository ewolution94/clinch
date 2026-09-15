interface ClinchMarkProps {
  size?: number;
  className?: string;
}

/**
 * Two bracket arms closing on a single point — a playoff bracket narrowing to
 * one team, and the act the whole app is named for. Chevrons rather than a
 * literal bracket because they still read at 16px in a browser tab.
 */
export function ClinchMark({ size = 32, className }: ClinchMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="clinch-arm" x1="0" y1="4" x2="0" y2="28">
          <stop offset="0" stopColor="#ff9a52" />
          <stop offset="1" stopColor="#f8520a" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#clinch-arm)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M5 5.5 L14 16 L5 26.5" />
        <path d="M27 5.5 L18 16 L27 26.5" />
      </g>
      <circle cx="16" cy="16" r="2.9" fill="#ffc53d" />
    </svg>
  );
}
