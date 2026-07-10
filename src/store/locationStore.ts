import { create } from 'zustand';
import { GeoLocation } from '@/types';

interface LocationState {
  currentLocation: GeoLocation | null;
  isTracking: boolean;
  hasPermission: boolean;
  address: string;

  setCurrentLocation: (location: GeoLocation) => void;
  setTracking: (tracking: boolean) => void;
  setPermission: (hasPermission: boolean) => void;
  setAddress: (address: string) => void;
}

export const useLocationStore = create<LocationState>(set => ({
  currentLocation: null,
  isTracking: false,
  hasPermission: false,
  address: '',

  setCurrentLocation: currentLocation => set({ currentLocation }),
  setTracking: isTracking => set({ isTracking }),
  setPermission: hasPermission => set({ hasPermission }),
  setAddress: address => set({ address }),
}));

