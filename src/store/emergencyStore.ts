import { create } from 'zustand';
import { EmergencyContact, EmergencyAlert, GeoLocation } from '@/types';

interface EmergencyState {
  isSosActive: boolean;
  activeAlert: EmergencyAlert | null;
  contacts: EmergencyContact[];
  lastLocation: GeoLocation | null;

  activateSOS: (location: GeoLocation) => void;
  deactivateSOS: () => void;
  setContacts: (contacts: EmergencyContact[]) => void;
  addContact: (contact: EmergencyContact) => void;
  removeContact: (id: string) => void;
  setLastLocation: (location: GeoLocation) => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  isSosActive: false,
  activeAlert: null,
  contacts: [],
  lastLocation: null,

  activateSOS: (location: GeoLocation) => {
    const alert: EmergencyAlert = {
      id: Date.now().toString(),
      userId: '',
      location,
      status: 'active',
      contacts: get().contacts,
      activatedAt: new Date().toISOString(),
    };
    set({ isSosActive: true, activeAlert: alert, lastLocation: location });
  },

  deactivateSOS: () => {
    const { activeAlert } = get();
    if (activeAlert) {
      set({
        isSosActive: false,
        activeAlert: {
          ...activeAlert,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        },
      });
    }
  },

  setContacts: contacts => set({ contacts }),
  addContact: contact => set(state => ({ contacts: [...state.contacts, contact] })),
  removeContact: id => set(state => ({ contacts: state.contacts.filter(c => c.id !== id) })),
  setLastLocation: lastLocation => set({ lastLocation }),
}));

