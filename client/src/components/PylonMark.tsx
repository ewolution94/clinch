interface PylonMarkProps {
  size?: number;
  className?: string;
}

/**
 * An end-zone pylon in three-quarter view: a tall square prism, two lit faces
 * and one in shadow. Kept narrow — at 32px a squarer body just reads as a box.
 */
export function PylonMark({ size = 32, className }: PylonMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pylon-lit" x1="0" y1="6" x2="0" y2="30">
          <stop offset="0" stopColor="#ff9a52" />
          <stop offset="1" stopColor="#f8520a" />
        </linearGradient>
        <linearGradient id="pylon-shade" x1="0" y1="6" x2="0" y2="30">
          <stop offset="0" stopColor="#c0450e" />
          <stop offset="1" stopColor="#832c06" />
        </linearGradient>
      </defs>
      {/* front-left face, front-right face, then the top cap */}
      <path d="M16 8.8 L16 30 L7 25.6 L7 4.4 Z" fill="url(#pylon-lit)" />
      <path d="M16 8.8 L16 30 L25 25.6 L25 4.4 Z" fill="url(#pylon-shade)" />
      <path d="M7 4.4 L16 1 L25 4.4 L16 8.8 Z" fill="#ffbc8c" />
    </svg>
  );
}
