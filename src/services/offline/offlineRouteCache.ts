import AsyncStorage from '@react-native-async-storage/async-storage';

import { GeneratedRouteType, RouteWaypoint } from '@services/api/routes.api';
import { Coordinate } from '@utils/routeMap';

export type OfflineRouteCacheEntry = {
  bookingId: number;
  tourId?: number;
  routeId: number;
  tourTitle?: string;
  routeName?: string;
  polylineData?: string;
  decodedCoordinates: Coordinate[];
  waypoints: RouteWaypoint[];
  routeType?: GeneratedRouteType | string;
  downloadedAt: string;
};

const OFFLINE_ROUTE_PREFIX = '@chektrek/offline-route';

const getRouteCacheKey = (bookingId: number, routeId: number): string =>
  `${OFFLINE_ROUTE_PREFIX}/${bookingId}/${routeId}`;

const isRouteCacheKey = (key: string): boolean => key.startsWith(`${OFFLINE_ROUTE_PREFIX}/`);

export const offlineRouteCache = {
  saveRoute: async (entry: OfflineRouteCacheEntry): Promise<void> => {
    await AsyncStorage.setItem(
      getRouteCacheKey(entry.bookingId, entry.routeId),
      JSON.stringify(entry),
    );
    console.log('[OfflineRoute] saved', {
      bookingId: entry.bookingId,
      routeId: entry.routeId,
      points: entry.decodedCoordinates.length,
    });
  },

  loadRoute: async (bookingId: number, routeId: number): Promise<OfflineRouteCacheEntry | null> => {
    try {
      const rawEntry = await AsyncStorage.getItem(getRouteCacheKey(bookingId, routeId));
      const entry = rawEntry ? (JSON.parse(rawEntry) as OfflineRouteCacheEntry) : null;
      console.log('[OfflineRoute] loaded', {
        bookingId,
        routeId,
        found: Boolean(entry),
      });
      return entry;
    } catch (error) {
      console.log('[OfflineRoute] loaded', { bookingId, routeId, found: false, error });
      return null;
    }
  },

  listRoutes: async (): Promise<OfflineRouteCacheEntry[]> => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter(isRouteCacheKey);
      const entries = await AsyncStorage.multiGet(keys);
      const routes = entries
        .map(([, value]) => (value ? (JSON.parse(value) as OfflineRouteCacheEntry) : null))
        .filter((entry): entry is OfflineRouteCacheEntry => Boolean(entry))
        .sort(
          (first, second) =>
            new Date(second.downloadedAt).getTime() - new Date(first.downloadedAt).getTime(),
        );
      console.log('[OfflineRoute] loaded', { count: routes.length });
      return routes;
    } catch (error) {
      console.log('[OfflineRoute] loaded', { count: 0, error });
      return [];
    }
  },
};
