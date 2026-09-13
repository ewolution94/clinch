import { clsx } from "clsx";
import { logoUrl } from "../lib/format";

interface TeamLogoProps {
  abbr: string;
  size?: number;
  className?: string;
  /**
   * Team colour. Draws a neutral contrast plate ringed in that colour — the
   * colour never sits *behind* the mark, because several teams' logos are the
   * same hue as their brand and simply disappear into a coloured wash
   * (the Jets, Eagles, Seahawks and Giants are the worst of them). A light
   * plate plus a faint halo lifts dark marks off a near-black page instead.
   */
  accent?: string;
  eager?: boolean;
}

export function TeamLogo({ abbr, size = 28, className, accent, eager }: TeamLogoProps) {
  const plated = Boolean(accent);

  return (
    <span
      className={clsx("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {plated && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--color-paper) 13%, transparent)",
            border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
          }}
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
        style={{
          padding: plated ? Math.round(size * 0.12) : 0,
          filter: plated
            ? "drop-shadow(0 0 2px rgba(255,255,255,0.38)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
            : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
        }}
      />
    </span>
  );
}
