import { create } from 'zustand';
import { storageService } from '@services/storage/asyncStorageService';

type LanguageCode = 'vi' | 'en' | 'zh';

interface LanguageState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

const LANGUAGE_STORAGE_KEY = 'app_language';

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'vi', // default language
  
  setLanguage: async (lang: LanguageCode) => {
    await storageService.set(LANGUAGE_STORAGE_KEY, lang);
    set({ language: lang });
  },

  loadLanguage: async () => {
    try {
      const savedLang = await storageService.get<LanguageCode>(LANGUAGE_STORAGE_KEY);
      if (savedLang) {
        set({ language: savedLang });
      }
    } catch {
      // Fail silently, fallback to default 'vi'
    }
  },
}));
