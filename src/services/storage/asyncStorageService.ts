import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    await AsyncStorage.multiRemove(keys);
  },

  clear: async (): Promise<void> => {
    await AsyncStorage.clear();
  },

  getAllKeys: async (): Promise<string[]> => {
    const keys = await AsyncStorage.getAllKeys();
    return [...keys];
  },
};
