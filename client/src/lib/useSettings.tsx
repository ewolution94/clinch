import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readConfig } from "../../vendor/ewo/elements/config-client.js";
import { shownFor, type Shown } from "./defaults";
import {
  DEFAULT_SETTINGS,
  applySettings,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings";
import { stringsFor } from "./strings";

/** What the page shows for this device's picks: theirs, else Dashboard's, else built-in. */
const shownOf = (settings: Settings): Shown => shownFor(settings, readConfig());

interface SettingsApi {
  /** This device's picks, as stored: the theme and language may still be `default`. */
  settings: Settings;
  /** The theme, language and motion the page shows; read these, not the picks. */
  shown: Shown;
  /** False until localStorage has been read — the first render is defaults. */
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsApi>({
  settings: DEFAULT_SETTINGS,
  shown: shownFor(DEFAULT_SETTINGS, {}),
  hydrated: false,
  update: () => undefined,
});

/**
 * Wraps the app so anything can read a preference without it being threaded
 * through as props — the same reason `AccentProvider` exists next door.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    applySettings(shownOf(stored));
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      applySettings(shownOf(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, shown: shownOf(settings), hydrated, update }),
    [settings, hydrated, update],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsApi {
  return useContext(SettingsContext);
}

/** The BCP-47 tag for date and time formatting. */
export function useLocale(): string {
  return useSettings().shown.lang === "de" ? "de-DE" : "en-GB";
}

/** The reader's team, if they've picked one. */
export function useFavourite(): string | null {
  return useSettings().settings.favourite;
}

/** Interface copy in the reader's language. */
export function useStrings() {
  return stringsFor(useSettings().shown.lang);
}
