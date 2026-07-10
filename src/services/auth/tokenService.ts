import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '@/types';
import { STORAGE_KEYS } from '@constants/index';

export const tokenService = {
  getAccessToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  saveTokens: async (tokens: AuthTokens): Promise<void> => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken],
    ]);
  },

  clearTokens: async (): Promise<void> => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
  },

  isTokenExpired: (expiresAt: number): boolean => {
    return Date.now() >= expiresAt * 1000;
  },
};

