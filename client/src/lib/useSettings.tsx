import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  applySettings,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings";
import { stringsFor } from "./strings";

interface SettingsApi {
  settings: Settings;
  /** False until localStorage has been read — the first render is defaults. */
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsApi>({
  settings: DEFAULT_SETTINGS,
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
    applySettings(stored);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      applySettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, hydrated, update }),
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
  return useSettings().settings.lang === "de" ? "de-DE" : "en-GB";
}

/** Interface copy in the reader's language. */
export function useStrings() {
  return stringsFor(useSettings().settings.lang);
}
