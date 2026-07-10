import { create } from 'zustand';
import { Trip, Checkpoint, GeoLocation } from '@/types';

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  selectedTrip: Trip | null;
  liveRoute: GeoLocation[];
  isTracking: boolean;

  setTrips: (trips: Trip[]) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setSelectedTrip: (trip: Trip | null) => void;
  appendRoutePoint: (point: GeoLocation) => void;
  clearRoute: () => void;
  markCheckpointReached: (checkpointId: string) => void;
  setTracking: (tracking: boolean) => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  activeTrip: null,
  selectedTrip: null,
  liveRoute: [],
  isTracking: false,

  setTrips: trips => set({ trips }),
  setActiveTrip: activeTrip => set({ activeTrip }),
  setSelectedTrip: selectedTrip => set({ selectedTrip }),

  appendRoutePoint: point =>
    set(state => ({ liveRoute: [...state.liveRoute, point] })),

  clearRoute: () => set({ liveRoute: [] }),

  markCheckpointReached: (checkpointId: string) => {
    const { activeTrip } = get();
    if (!activeTrip) return;

    const updatedCheckpoints = activeTrip.checkpoints.map((cp: Checkpoint) =>
      cp.id === checkpointId
        ? { ...cp, isReached: true, reachedAt: new Date().toISOString() }
        : cp,
    );

    set({ activeTrip: { ...activeTrip, checkpoints: updatedCheckpoints } });
  },

  setTracking: isTracking => set({ isTracking }),
}));

