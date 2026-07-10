import { create } from 'zustand';

interface SavedState {
  savedTourIds: string[];
  downloadedTourIds: string[];
  toggleSaved: (tourId: string) => void;
  toggleDownloaded: (tourId: string) => void;
  isSaved: (tourId: string) => boolean;
  isDownloaded: (tourId: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedTourIds: ['t_laothan', 't_cattien'],
  downloadedTourIds: ['t_cattien'],

  toggleSaved: (tourId) => set((state) => {
    const isSaved = state.savedTourIds.includes(tourId);
    const newSaved = isSaved 
      ? state.savedTourIds.filter(id => id !== tourId) 
      : [...state.savedTourIds, tourId];
    return { savedTourIds: newSaved };
  }),

  toggleDownloaded: (tourId) => set((state) => {
    const isDownloaded = state.downloadedTourIds.includes(tourId);
    const newDownloaded = isDownloaded 
      ? state.downloadedTourIds.filter(id => id !== tourId) 
      : [...state.downloadedTourIds, tourId];
    return { downloadedTourIds: newDownloaded };
  }),

  isSaved: (tourId) => get().savedTourIds.includes(tourId),
  isDownloaded: (tourId) => get().downloadedTourIds.includes(tourId),
}));
