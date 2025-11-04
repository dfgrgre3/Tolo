import { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from './safe-client-utils';

// Translation data
import arTranslations from '../../public/locales/ar/common.json';
import enTranslations from '../../public/locales/en/common.json';

type Language = 'ar' | 'en';
type TranslationKey = string;

const translations = {
  ar: arTranslations,
  en: enTranslations,
};

export function useTranslation() {
  // Initialize with a fixed default value to prevent hydration mismatch
  const [language, setLanguage] = useState<Language>('ar');
  const [isMounted, setIsMounted] = useState(false);

  // Load language from localStorage on mount (for SSR consistency)
  useEffect(() => {
    setIsMounted(true);
    const savedLanguage = safeGetItem('language', { fallback: 'ar' }) as Language;
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const t = (key: TranslationKey): string => {
    // Use 'ar' as default during SSR or before mounting
    const currentLang = isMounted ? language : 'ar';
    const keys = key.split('.');
    let value: any = translations[currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    safeSetItem('language', newLanguage);
  };

  return { t, language, changeLanguage, isMounted };
}