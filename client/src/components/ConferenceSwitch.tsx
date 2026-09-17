import { clsx } from "clsx";
import type { ConferenceId } from "../lib/types";
import { useStrings } from "../lib/useSettings";

interface ConferenceSwitchProps {
  value: ConferenceId;
  onChange: (conference: ConferenceId) => void;
}

/**
 * Lives with the content it controls rather than in the global bar.
 *
 * It only ever applied to two of the four views, and keeping it in the sticky
 * nav cost 116px of a 390px row — which is why there was no room for a fourth
 * tab. Here it is both better placed and out of the way.
 */
export function ConferenceSwitch({ value, onChange }: ConferenceSwitchProps) {
  const t = useStrings();
  return (
    <nav
      className="flex self-start rounded-full border border-line bg-ink/70 p-0.5"
      aria-label={t.conference}
    >
      {(["AFC", "NFC"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={value === id ? "true" : undefined}
          className={clsx(
            "rounded-full px-5 py-1.5 font-mono text-[14.5px] font-medium tracking-wide transition-colors",
            value === id
              ? "bg-brand/15 text-brand"
              : "text-mist hover:text-fog",
          )}
        >
          {id}
        </button>
      ))}
    </nav>
  );
}
