import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  EffectiveLanguage,
  languageOptions,
  LanguageState,
  PreferredLanguage,
  resolveEffectiveLanguage,
} from "../../shared/language";
import { translations, TranslationKey } from "./translations";

interface I18nContextValue extends LanguageState {
  setPreferredLanguage: (language: PreferredLanguage) => Promise<void>;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const fallbackLanguageState: LanguageState = {
  effectiveLanguage: resolveEffectiveLanguage(
    "system",
    navigator.language || "en-US"
  ),
  preferredLanguage: "system",
  systemLanguage: resolveEffectiveLanguage("system", navigator.language || "en-US"),
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languageState, setLanguageState] =
    useState<LanguageState>(fallbackLanguageState);

  useEffect(() => {
    window.electronAPI?.getLanguageState().then(setLanguageState);
    const cleanup = window.electronAPI?.onLanguageChanged(setLanguageState);
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (
      key: TranslationKey,
      values: Record<string, string | number> = {}
    ) => {
      let text = translations[languageState.effectiveLanguage][key];
      Object.entries(values).forEach(([name, value]) => {
        text = text.replace(`{${name}}`, String(value));
      });
      return text;
    };

    return {
      ...languageState,
      setPreferredLanguage: async (language: PreferredLanguage) => {
        const nextState =
          await window.electronAPI?.setPreferredLanguage(language);
        if (nextState) setLanguageState(nextState);
      },
      t,
    };
  }, [languageState]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export { languageOptions };
export type { EffectiveLanguage, PreferredLanguage };
