import { clsx } from "clsx";
import { logoUrl } from "../lib/format";
import { useAccent } from "../lib/accents";

interface TeamLogoProps {
  abbr: string;
  size?: number;
  className?: string;
  /**
   * Team colour, drawn as a ring around the mark and never behind it — several
   * teams' logos are the same hue as their brand and disappear into a coloured
   * wash (the Jets, Eagles, Seahawks and Giants are the worst). Optional: left
   * out, it is looked up from the accent context, so a chip is never colourless
   * merely because its caller was only handed an abbreviation.
   */
  accent?: string;
  eager?: boolean;
}

/**
 * One chip, everywhere in the app.
 *
 * Every mark sits on the same near-paper disc, and that is a measurement rather
 * than a taste: across the 32 marks, luminance spans 34× (the Giants at 0.019,
 * the Steelers at 0.643). On the near-black card ground three of them — NYG,
 * LAR, NYJ — fall to 1.2–2.2:1 and read as coloured smudges. On a light disc the
 * *worst* team in the league is 4.2:1. No single dark treatment can serve both
 * ends of that range, so the disc is light for all 32 and the team's colour does
 * its work as a ring instead.
 *
 * The disc is unconditional on purpose. Making it appear only when an accent
 * happened to be threaded through is what left the same team looking like two
 * different things on two different screens.
 */
export function TeamLogo({
  abbr,
  size = 28,
  className,
  accent,
  eager,
}: TeamLogoProps) {
  const known = useAccent(abbr);
  const ring = accent ?? known ?? "var(--color-fog)";
  // Small chips need proportionally less padding or the mark gets tiny.
  const pad = Math.max(1, Math.round(size * (size <= 22 ? 0.1 : 0.14)));

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: "var(--color-plate)",
        // Inset ring rather than a border, so the chip's box stays exactly `size`
        // and never nudges the row it sits in.
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ring} 60%, transparent), 0 1px 2px rgba(0,0,0,0.5)`,
      }}
    >
      <img
        src={logoUrl(abbr)}
        alt={`${abbr} logo`}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="relative h-full w-full object-contain"
        style={{ padding: pad }}
      />
    </span>
  );
}
