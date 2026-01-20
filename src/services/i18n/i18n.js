import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider, useTranslation as useI18NextTranslation } from 'react-i18next';
import { storage, APP_STORAGE_KEYS } from '../storage/storage';
import en from '../../../locales/en.json';
import ar from '../../../locales/ar.json';

const SUPPORTED_LANGUAGES = new Set(['en', 'ar']);
const DEFAULT_LANGUAGE = 'en';

const I18nContext = createContext();

const isRTLLanguage = (lang) => lang === 'ar';

const initI18n = () => {
  if (i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const applyRTL = (nextLanguage) => {
    const newIsRTL = isRTLLanguage(nextLanguage);
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

  const loadLanguage = async () => {
    try {
      const savedLanguage = await storage.getItem(APP_STORAGE_KEYS.LANGUAGE);
      const normalized = typeof savedLanguage === 'string' ? savedLanguage.toLowerCase() : null;
      const nextLanguage = SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
      await i18n.changeLanguage(nextLanguage);
      setLanguage(nextLanguage);
      applyRTL(nextLanguage);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error loading language:', error);
      }
      await i18n.changeLanguage(DEFAULT_LANGUAGE);
      setLanguage(DEFAULT_LANGUAGE);
      applyRTL(DEFAULT_LANGUAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    const normalized = typeof newLanguage === 'string' ? newLanguage.toLowerCase() : DEFAULT_LANGUAGE;
    const nextLanguage = SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
    try {
      await storage.setItem(APP_STORAGE_KEYS.LANGUAGE, nextLanguage);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error changing language:', error);
      }
    }
    await i18n.changeLanguage(nextLanguage);
    setLanguage(nextLanguage);
    applyRTL(nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      isRTL,
      isLoading,
      changeLanguage,
    }),
    [language, isRTL, isLoading]
  );

  return (
    <I18nContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  const { t } = useI18NextTranslation();
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return { ...context, t };
}

export function useTranslation() {
  const { t, i18n: i18nInstance } = useI18NextTranslation();
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return {
    t,
    isRTL: context.isRTL,
    locale: i18nInstance.language,
    i18n: {
      language: i18nInstance.language,
    },
  };
}
