import { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import { en } from './translations.en';
import { ar } from './translations.ar';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';

const translations = {
  en,
  ar,
};

const SUPPORTED_LANGUAGES = new Set(['en', 'ar']);

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await storage.getItem(APP_STORAGE_KEYS.LANGUAGE);
      const normalized = typeof savedLanguage === 'string' ? savedLanguage.toLowerCase() : null;
      const nextLanguage = SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'en';
      setLanguage(nextLanguage);
      setIsRTL(nextLanguage === 'ar');
    } catch (error) {
      if (__DEV__) {
        console.warn('Error loading language:', error);
      }
      setLanguage('en');
      setIsRTL(false);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    const normalized = typeof newLanguage === 'string' ? newLanguage.toLowerCase() : 'en';
    const nextLanguage = SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'en';
    try {
      await storage.setItem(APP_STORAGE_KEYS.LANGUAGE, nextLanguage);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error changing language:', error);
      }
    }

    setLanguage(nextLanguage);
    const newIsRTL = nextLanguage === 'ar';
    setIsRTL(newIsRTL);

    if (I18nManager.isRTL !== newIsRTL) {
      try {
        I18nManager.allowRTL(newIsRTL);
        I18nManager.forceRTL(newIsRTL);
      } catch (error) {
        if (__DEV__) {
          console.warn('Error updating RTL settings:', error);
        }
      }
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return key;
      }
    }

    return value;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        isRTL,
        isLoading,
        changeLanguage,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, isRTL, language } = useI18n();
  return {
    t,
    isRTL,
    i18n: {
      language,
    },
  };
}
