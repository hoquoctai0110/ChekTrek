import { create } from 'zustand';
import { Tour, Destination, TourFilters } from '@/types';

interface TourState {
  tours: Tour[];
  featuredTours: Tour[];
  destinations: Destination[];
  selectedTour: Tour | null;
  filters: TourFilters;
  isLoading: boolean;
  error: string | null;

  setTours: (tours: Tour[]) => void;
  setFeaturedTours: (tours: Tour[]) => void;
  setDestinations: (destinations: Destination[]) => void;
  setSelectedTour: (tour: Tour | null) => void;
  setFilters: (filters: Partial<TourFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTourStore = create<TourState>(set => ({
  tours: [],
  featuredTours: [],
  destinations: [],
  selectedTour: null,
  filters: {},
  isLoading: false,
  error: null,

  setTours: tours => set({ tours }),
  setFeaturedTours: featuredTours => set({ featuredTours }),
  setDestinations: destinations => set({ destinations }),
  setSelectedTour: selectedTour => set({ selectedTour }),
  setFilters: newFilters => set(state => ({ filters: { ...state.filters, ...newFilters } })),
  clearFilters: () => set({ filters: {} }),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),
}));

