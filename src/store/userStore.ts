import { create } from 'zustand';
import { User } from '@/types';

interface UserState {
  profile: User | null;
  isEditMode: boolean;

  setProfile: (user: User) => void;
  updateProfile: (partial: Partial<User>) => void;
  setEditMode: (editMode: boolean) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isEditMode: false,

  setProfile: profile => set({ profile }),

  updateProfile: (partial: Partial<User>) => {
    const { profile } = get();
    if (profile) {
      set({ profile: { ...profile, ...partial } });
    }
  },

  setEditMode: isEditMode => set({ isEditMode }),
}));

