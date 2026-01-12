import { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import { en } from './translations.en';
import { ar } from './translations.ar';
import { storage } from '../storage/storage';

const translations = {
  en,
  ar,
};

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
      const savedLanguage = await storage.getLanguage();
      if (savedLanguage) {
        setLanguage(savedLanguage);
        setIsRTL(savedLanguage === 'ar');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await storage.setLanguage(newLanguage);
      setLanguage(newLanguage);
      const newIsRTL = newLanguage === 'ar';
      setIsRTL(newIsRTL);

      if (I18nManager.isRTL !== newIsRTL) {
        I18nManager.allowRTL(newIsRTL);
        I18nManager.forceRTL(newIsRTL);
      }
    } catch (error) {
      console.error('Error changing language:', error);
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
