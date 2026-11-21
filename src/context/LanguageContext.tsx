import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  type LanguageCode,
  type LanguageOption,
  type TranslationKey,
} from '../lib/i18n';

interface LanguageContextValue {
  lang: LanguageCode;
  languageOption: LanguageOption;
  setLang: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

const STORAGE_KEY = 'udaya_lang';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && saved in TRANSLATIONS) return saved;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const languageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const t = useCallback(
    (key: TranslationKey): string => {
      return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, languageOption, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
