import { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as settings from "./lib/settings.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [rev, setRev] = useState(0);
  const [language, setLanguageState] = useState(() => settings.getSettings().language || "en");
  const refresh = useCallback(() => setRev((n) => n + 1), []);
  const setLanguage = useCallback((next) => {
    settings.saveSettings({ language: next });
    setLanguageState(next);
  }, []);
  const value = useMemo(() => ({ rev, refresh, language, setLanguage }), [rev, refresh, language, setLanguage]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
