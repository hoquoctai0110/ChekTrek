import { useLanguageStore } from '@store/languageStore';
import { translations, TranslationKey } from '@utils/translations';

export const useTranslation = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations[language] || translations.vi;
    const value = dict[key];
    return value || fallback || key;
  };

  return { t, language, setLanguage };
};
