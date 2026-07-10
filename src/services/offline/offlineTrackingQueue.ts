import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  trackingApi,
  TrackingDirection,
  TrackingLocationRequest,
} from '@services/api/tracking.api';

export type OfflineTrackingLocationRequest = Omit<TrackingLocationRequest, 'trackingSessionId'> & {
  trackingSessionId?: number | string;
  localSessionId?: string;
  bookingId: number;
  routeId?: number;
  progressIndex?: number;
  direction?: TrackingDirection;
  source?: 'gps' | 'simulator';
  recordedAt?: string;
};

export type QueuedTrackingPoint = OfflineTrackingLocationRequest & {
  localId: string;
  recordedAt: string;
  synced: false;
};

type LocalSessionMap = Record<string, number>;

const OFFLINE_TRACKING_QUEUE_KEY = '@chektrek/offline-tracking-queue';
const OFFLINE_TRACKING_SESSION_MAP_KEY = '@chektrek/offline-tracking-session-map';
const DUPLICATE_DISTANCE_DEGREES = 0.000005;

const readQueue = async (): Promise<QueuedTrackingPoint[]> => {
  const rawQueue = await AsyncStorage.getItem(OFFLINE_TRACKING_QUEUE_KEY);
  const queue = rawQueue ? (JSON.parse(rawQueue) as QueuedTrackingPoint[]) : [];
  return Array.isArray(queue) ? queue : [];
};

const writeQueue = async (queue: QueuedTrackingPoint[]): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_TRACKING_QUEUE_KEY, JSON.stringify(queue));
};

const readSessionMap = async (): Promise<LocalSessionMap> => {
  const rawMap = await AsyncStorage.getItem(OFFLINE_TRACKING_SESSION_MAP_KEY);
  const sessionMap = rawMap ? (JSON.parse(rawMap) as LocalSessionMap) : {};
  return sessionMap && typeof sessionMap === 'object' ? sessionMap : {};
};

const writeSessionMap = async (sessionMap: LocalSessionMap): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_TRACKING_SESSION_MAP_KEY, JSON.stringify(sessionMap));
};

const isDuplicatePoint = (
  first: OfflineTrackingLocationRequest,
  second: OfflineTrackingLocationRequest,
): boolean =>
  (first.localSessionId ?? first.trackingSessionId) ===
    (second.localSessionId ?? second.trackingSessionId) &&
  Math.abs(first.latitude - second.latitude) < DUPLICATE_DISTANCE_DEGREES &&
  Math.abs(first.longitude - second.longitude) < DUPLICATE_DISTANCE_DEGREES;

const getPointSessionKey = (point: OfflineTrackingLocationRequest): string =>
  String(point.localSessionId ?? point.trackingSessionId ?? '');

const getBackendSessionId = async (
  point: QueuedTrackingPoint,
  sessionMap: LocalSessionMap,
): Promise<number | null> => {
  if (typeof point.trackingSessionId === 'number' && point.trackingSessionId > 0) {
    return point.trackingSessionId;
  }

  const localSessionId = getPointSessionKey(point);
  if (!localSessionId) return null;
  if (sessionMap[localSessionId]) return sessionMap[localSessionId];

  const response = await trackingApi.startTracking(point.bookingId, point.direction ?? 'OUTBOUND');
  sessionMap[localSessionId] = response.trackingSessionId;
  await writeSessionMap(sessionMap);
  console.log('[OfflineSync] backend session created', {
    localSessionId,
    trackingSessionId: response.trackingSessionId,
  });
  return response.trackingSessionId;
};

export const offlineTrackingQueue = {
  enqueuePoint: async (payload: OfflineTrackingLocationRequest): Promise<QueuedTrackingPoint[]> => {
    const queue = await readQueue();
    const lastMatchingPoint = [...queue]
      .reverse()
      .find(point => getPointSessionKey(point) === getPointSessionKey(payload));

    if (
      payload.source !== 'simulator' &&
      lastMatchingPoint &&
      isDuplicatePoint(lastMatchingPoint, payload)
    ) {
      return queue;
    }

    const queuedPoint: QueuedTrackingPoint = {
      ...payload,
      localSessionId: payload.localSessionId ?? String(payload.trackingSessionId ?? ''),
      localId: `${getPointSessionKey(payload)}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
      synced: false,
    };
    const nextQueue = [...queue, queuedPoint];
    await writeQueue(nextQueue);
    console.log('[OfflineTracking] queued point', queuedPoint);
    return nextQueue;
  },

  getPendingPoints: async (trackingSessionId?: number | string): Promise<QueuedTrackingPoint[]> => {
    const queue = await readQueue();
    return trackingSessionId
      ? queue.filter(point => getPointSessionKey(point) === String(trackingSessionId))
      : queue;
  },

  syncPendingPoints: async (
    trackingSessionId?: number | string,
  ): Promise<QueuedTrackingPoint[]> => {
    const queue = await readQueue();
    const pointsToSync = trackingSessionId
      ? queue.filter(point => getPointSessionKey(point) === String(trackingSessionId))
      : queue;

    if (pointsToSync.length === 0) return queue;

    console.log('[OfflineSync] syncing queued points', {
      trackingSessionId,
      count: pointsToSync.length,
    });

    const syncedLocalIds = new Set<string>();
    const sessionMap = await readSessionMap();

    try {
      for (const point of pointsToSync) {
        const backendSessionId = await getBackendSessionId(point, sessionMap);
        if (!backendSessionId) continue;

        await trackingApi.sendLocation({
          trackingSessionId: backendSessionId,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          altitude: point.altitude,
          speed: point.speed,
        });
        syncedLocalIds.add(point.localId);
      }

      const remainingQueue = queue.filter(point => !syncedLocalIds.has(point.localId));
      await writeQueue(remainingQueue);
      console.log('[OfflineTracking] sync success', {
        trackingSessionId,
        count: syncedLocalIds.size,
      });
      return remainingQueue;
    } catch (error) {
      if (syncedLocalIds.size > 0) {
        const remainingQueue = queue.filter(point => !syncedLocalIds.has(point.localId));
        await writeQueue(remainingQueue);
        console.log('[OfflineTracking] sync success', {
          trackingSessionId,
          count: syncedLocalIds.size,
        });
        console.log('[OfflineTracking] sync failed', error);
        return remainingQueue;
      }
      console.log('[OfflineTracking] sync failed', error);
      return queue;
    }
  },
};
