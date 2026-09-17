import { clsx } from "clsx";
import { useDismissable } from "../lib/useDismissable";
import { useSettings, useStrings } from "../lib/useSettings";
import type {
  ConferencePref,
  Landing,
  Lang,
  Motion,
  Settings,
  Theme,
} from "../lib/settings";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line-soft py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="font-display text-[14.5px] font-semibold text-paper">
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 font-display text-[12.5px] leading-snug text-mist">
            {hint}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** The same pill language as the header's view tabs, at a smaller size. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-full gap-1 rounded-full border border-line bg-abyss-2/70 p-1 sm:w-auto"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={clsx(
            "flex-1 rounded-full px-3 py-1.5 font-mono text-[12px] tracking-[0.08em] whitespace-nowrap transition-colors sm:flex-none",
            value === option.id
              ? "bg-paper text-abyss"
              : "text-mist hover:text-fog",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, update } = useSettings();
  const t = useStrings();
  useDismissable(open, onClose);

  if (!open) return null;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update({ [key]: value } as Partial<Settings>);

  // Reduced motion beats the creative theme — worth saying out loud rather than
  // leaving the reader to wonder why nothing moves.
  const motionReduced =
    settings.motion === "reduced" ||
    (settings.motion === "system" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-abyss/75 backdrop-blur-sm"
        style={{ touchAction: "none" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
        className="animate-rise relative flex max-h-[88dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl border border-line bg-ink shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="font-display text-[19px] font-bold tracking-tight text-paper">
              {t.settingsTitle}
            </h2>
            <p className="mt-1 font-display text-[12.5px] leading-snug text-mist">
              {t.settingsHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-fog/40 hover:text-paper"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 pb-5">
          <Row label={t.theme} hint={t.themeHint}>
            <Segmented<Theme>
              label={t.theme}
              value={settings.theme}
              onChange={(v) => set("theme", v)}
              options={[
                { id: "dark", label: t.themeDark },
                { id: "light", label: t.themeLight },
                { id: "creative", label: t.themeCreative },
              ]}
            />
          </Row>

          {settings.theme === "creative" && motionReduced && (
            <p className="-mt-1 pb-3 font-display text-[12.5px] leading-snug text-gold">
              {t.motionOverridesCreative}
            </p>
          )}

          <Row label={t.language}>
            <Segmented<Lang>
              label={t.language}
              value={settings.lang}
              onChange={(v) => set("lang", v)}
              options={[
                { id: "en", label: "English" },
                { id: "de", label: "Deutsch" },
              ]}
            />
          </Row>

          <Row label={t.opensOn} hint={t.opensOnHint}>
            <select
              aria-label={t.opensOn}
              value={settings.landing}
              onChange={(e) => set("landing", e.target.value as Landing)}
              className="w-full rounded-lg border border-line bg-abyss-2/70 px-3 py-2 font-mono text-[12.5px] text-paper sm:w-auto"
            >
              <option value="standings">{t.routeStandingsLong}</option>
              <option value="week">{t.routeWeekLong}</option>
              <option value="playoffs">{t.routePlayoffsLong}</option>
              <option value="bracket">{t.routeBracketLong}</option>
              <option value="last">{t.landingLast}</option>
            </select>
          </Row>

          <Row label={t.defaultConference} hint={t.defaultConferenceHint}>
            <Segmented<ConferencePref>
              label={t.defaultConference}
              value={settings.conference}
              onChange={(v) => set("conference", v)}
              options={[
                { id: "AFC", label: "AFC" },
                { id: "NFC", label: "NFC" },
                { id: "last", label: t.conferenceLast },
              ]}
            />
          </Row>

          <Row label={t.motion} hint={t.motionHint}>
            <Segmented<Motion>
              label={t.motion}
              value={settings.motion}
              onChange={(v) => set("motion", v)}
              options={[
                { id: "system", label: t.motionSystem },
                { id: "full", label: t.motionFull },
                { id: "reduced", label: t.motionReduced },
              ]}
            />
          </Row>
        </div>
      </div>
    </div>
  );
}
