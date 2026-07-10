import { create } from 'zustand';

interface PublicTourFeedState {
  version: number;
  invalidate: () => void;
}

export const usePublicTourFeedStore = create<PublicTourFeedState>(set => ({
  version: 0,
  invalidate: () => set(state => ({ version: state.version + 1 })),
}));
