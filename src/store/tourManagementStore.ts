import { create } from 'zustand';
import { ManagedTour, ManagedTourStatus } from '@/types';

interface TourManagementState {
  managedTours: ManagedTour[];
  filterStatus: ManagedTourStatus | 'all';
  searchQuery: string;
  isLoading: boolean;

  setManagedTours: (tours: ManagedTour[]) => void;
  setFilterStatus: (status: ManagedTourStatus | 'all') => void;
  setSearchQuery: (q: string) => void;
  deleteTour: (id: string) => void;
  updateTourStatus: (id: string, status: ManagedTourStatus) => void;
}

export const useTourManagementStore = create<TourManagementState>(set => ({
  managedTours: [],
  filterStatus: 'all',
  searchQuery: '',
  isLoading: false,

  setManagedTours: tours => set({ managedTours: tours }),

  setFilterStatus: status => set({ filterStatus: status }),

  setSearchQuery: q => set({ searchQuery: q }),

  deleteTour: id =>
    set(state => ({
      managedTours: state.managedTours.filter(t => t.id !== id),
    })),

  updateTourStatus: (id, status) =>
    set(state => ({
      managedTours: state.managedTours.map(t =>
        t.id === id ? { ...t, status } : t
      ),
    })),
}));

