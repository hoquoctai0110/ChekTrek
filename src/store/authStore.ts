import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { User, AuthTokens } from '@/types';
import { authApi } from '@services/api/auth.api';
import { tokenService } from '@services/auth/tokenService';
import { storageService } from '@services/storage/asyncStorageService';
import { STORAGE_KEYS } from '@constants/index';
import { offlineMode } from '@services/offline/offlineMode';

const isNetworkError = (error: unknown): boolean => {
  const maybeAxios = error as { code?: string; message?: string; response?: unknown };
  const message = String(maybeAxios.message ?? '').toLowerCase();
  return (
    !maybeAxios.response &&
    (maybeAxios.code === 'ERR_NETWORK' ||
      maybeAxios.code === 'ECONNABORTED' ||
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('timeout'))
  );
};

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;

  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setOfflineMode: (isOfflineMode: boolean) => void;
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  checkOnlineMode: () => Promise<void>;
  resumeOnlineMode: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

const isConnectedState = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) =>
  state.isConnected === true && state.isInternetReachable !== false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  isOfflineMode: false,

  setUser: user => set({ user }),

  setTokens: tokens => set({ tokens }),

  setOfflineMode: isOfflineMode => {
    offlineMode.setEnabled(isOfflineMode);
    set({ isOfflineMode });
  },

  login: async (user, tokens) => {
    if (__DEV__) {
      console.log('[AuthStore] login user before save:', user);
    }
    await tokenService.saveTokens(tokens);
    await storageService.set(STORAGE_KEYS.USER_PROFILE, user);
    if (__DEV__) {
      const storedUser = await storageService.get<User>(STORAGE_KEYS.USER_PROFILE);
      console.log('[AuthStore] current user in AsyncStorage:', storedUser);
    }
    offlineMode.setEnabled(false);
    set({ user, tokens, isAuthenticated: true, isLoading: false, isOfflineMode: false });
    if (__DEV__) {
      console.log('[AuthStore] current user in Zustand after login:', get().user);
    }
  },

  logout: async () => {
    await tokenService.clearTokens();
    await storageService.remove(STORAGE_KEYS.USER_PROFILE);
    offlineMode.setEnabled(false);
    set({ user: null, tokens: null, isAuthenticated: false, isOfflineMode: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      console.log('[Startup] restoring local auth');
      const accessToken = await tokenService.getAccessToken();
      const refreshToken = await tokenService.getRefreshToken();
      const user = await storageService.get<User>(STORAGE_KEYS.USER_PROFILE);
      if (__DEV__) {
        console.log('[AuthStore] restored user from AsyncStorage:', user);
      }
      const tokens =
        accessToken || refreshToken
          ? { accessToken: accessToken ?? '', refreshToken: refreshToken ?? '', expiresAt: 0 }
          : null;
      if (user) {
        console.log('[Startup] cached user found');
      }

      const networkState = await NetInfo.fetch();

      if (!isConnectedState(networkState)) {
        console.log('[Startup] network offline');
        console.log('[Startup] skipped refresh token');
        console.log('[Startup] skipped profile request');
        if (user) {
          console.log('[Startup] entering offline mode');
          offlineMode.setEnabled(true);
          set({
            user,
            tokens,
            isAuthenticated: true,
            isOfflineMode: true,
          });
          return;
        }

        offlineMode.setEnabled(true);
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isOfflineMode: true,
        });
        return;
      }

      offlineMode.setEnabled(false);
      if (accessToken && user) {
        set({ user, tokens, isAuthenticated: true });

        try {
          if (refreshToken) {
            const freshTokens = await authApi.refreshToken(refreshToken);
            await tokenService.saveTokens(freshTokens);
            set({ tokens: freshTokens });
          }
          const freshUser = await authApi.getProfile();
          await storageService.set(STORAGE_KEYS.USER_PROFILE, freshUser);
          set({ user: freshUser, isOfflineMode: false });
          if (__DEV__) {
            console.log('[AuthStore] current user in Zustand after profile refresh:', get().user);
          }
        } catch (error) {
          if (isNetworkError(error)) {
            console.log('[Startup] network offline');
            console.log('[Startup] entering offline mode');
            offlineMode.setEnabled(true);
            set({ isOfflineMode: true });
          } else {
            offlineMode.setEnabled(false);
            set({ isOfflineMode: false });
          }
        }
        return;
      }

      if (user) {
        try {
          const freshUser = await authApi.getProfile();
          await storageService.set(STORAGE_KEYS.USER_PROFILE, freshUser);
          set({ user: freshUser, isAuthenticated: true, isOfflineMode: false });
          if (__DEV__) {
            console.log('[AuthStore] current user in Zustand after startup profile fetch:', get().user);
          }
        } catch (error) {
          if (isNetworkError(error)) {
            console.log('[Startup] network offline');
            console.log('[Startup] cached user found');
            console.log('[Startup] entering offline mode');
            offlineMode.setEnabled(true);
            set({ user, tokens, isAuthenticated: true, isOfflineMode: true });
            return;
          }
          offlineMode.setEnabled(false);
          set({ user: null, isAuthenticated: false, isOfflineMode: false });
        }
        return;
      }

      try {
        await authApi.getProfile();
        set({ isOfflineMode: false });
      } catch (error) {
        if (isNetworkError(error)) {
          offlineMode.setEnabled(true);
          set({ isOfflineMode: true });
        } else {
          offlineMode.setEnabled(false);
          set({ isOfflineMode: false });
        }
      }
    } catch {
      // Session restore failed - stay logged out.
    } finally {
      set({ isLoading: false });
    }
  },

  checkOnlineMode: async () => {
    const networkState = await NetInfo.fetch();
    if (!isConnectedState(networkState)) {
      console.log('[Offline] network disconnected');
      offlineMode.setEnabled(true);
      set({ isOfflineMode: true });
      return;
    }

    try {
      await authApi.getProfile();
      offlineMode.setEnabled(false);
      set({ isOfflineMode: false });
    } catch (error) {
      if (isNetworkError(error)) {
        offlineMode.setEnabled(true);
        set({ isOfflineMode: true });
      } else {
        offlineMode.setEnabled(false);
        set({ isOfflineMode: false });
      }
    }
  },

  resumeOnlineMode: async () => {
    const networkState = await NetInfo.fetch();
    if (!isConnectedState(networkState)) {
      console.log('[Offline] network disconnected');
      offlineMode.setEnabled(true);
      set({ isOfflineMode: true });
      return;
    }

    const { user } = get();
    const refreshToken = await tokenService.getRefreshToken();

    try {
      if (refreshToken) {
        const freshTokens = await authApi.refreshToken(refreshToken);
        await tokenService.saveTokens(freshTokens);
        set({ tokens: freshTokens });
      }

      const freshUser = await authApi.getProfile();
      await storageService.set(STORAGE_KEYS.USER_PROFILE, freshUser);
      console.log('[Offline] backend sync resumed');
      offlineMode.setEnabled(false);
      set({ user: freshUser, isAuthenticated: true, isOfflineMode: false });
      if (__DEV__) {
        console.log('[AuthStore] current user in Zustand after resumeOnlineMode:', get().user);
      }
    } catch (error) {
      if (isNetworkError(error)) {
        console.log('[Offline] network disconnected');
        console.log('[Offline] entering offline mode');
        offlineMode.setEnabled(true);
        set({ isOfflineMode: true, isAuthenticated: Boolean(user), user });
        return;
      }

      offlineMode.setEnabled(false);
      set({ isOfflineMode: false });
    }
  },

  updateUser: (partial: Partial<User>) => {
    const { user } = get();
    if (user) {
      const updated = { ...user, ...partial };
      set({ user: updated });
      storageService.set(STORAGE_KEYS.USER_PROFILE, updated);
    }
  },
}));

