import * as Location from 'expo-location';
import { GeoLocation } from '@/types';

export const locationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  requestBackgroundPermissions: async (): Promise<boolean> => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  getCurrentLocation: async (): Promise<GeoLocation | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };
    } catch {
      return null;
    }
  },

  watchPosition: (
    callback: (location: GeoLocation) => void,
    interval = 5000,
  ): (() => void) => {
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: interval,
        distanceInterval: 10,
      },
      loc => {
        callback({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude ?? undefined,
          accuracy: loc.coords.accuracy ?? undefined,
          timestamp: loc.timestamp,
        });
      },
    ).then(sub => {
      subscription = sub;
    });

    return () => subscription?.remove();
  },

  reverseGeocode: async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result) {
        return [result.street, result.district, result.city, result.country]
          .filter(Boolean)
          .join(', ');
      }
    } catch {}
    return `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
  },
};

