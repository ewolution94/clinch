import { clsx } from "clsx";
import { logoUrl } from "../lib/format";

interface TeamLogoProps {
  abbr: string;
  size?: number;
  className?: string;
  /** Lays a soft wash of the team colour behind the mark. */
  glow?: string;
  eager?: boolean;
}

export function TeamLogo({ abbr, size = 28, className, glow, eager }: TeamLogoProps) {
  return (
    <span
      className={clsx("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-[7px] opacity-45"
          style={{ background: glow }}
        />
      )}
      <img
        src={logoUrl(abbr)}
        alt={`${abbr} logo`}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="relative h-full w-full object-contain"
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
      />
    </span>
  );
}
