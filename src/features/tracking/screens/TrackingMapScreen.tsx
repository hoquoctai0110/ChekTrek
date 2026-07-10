import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

import { EmergencyButton } from '@components/common/EmergencyButton';
import { MapboxUnavailableState } from '@components/common/MapboxUnavailableState';
import { RootStackParamList } from '@navigation/types';
import { GeneratedRouteType, routesApi, RouteWaypoint, TourRoute } from '@services/api/routes.api';
import { SosPayload, sosApi } from '@services/api/sos.api';
import {
  trackingApi,
  TrackingDirection,
  TrackingLocationRequest,
} from '@services/api/tracking.api';
import { offlineRouteCache } from '@services/offline/offlineRouteCache';
import { offlineSosQueue } from '@services/offline/offlineSosQueue';
import { offlineTrackingQueue } from '@services/offline/offlineTrackingQueue';
import { ensureMapboxConfigured, logMapboxRenderAttempt } from '@services/mapbox/mapboxConfig';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import {
  Coordinate,
  decodePolylineData,
  getManualRouteZoom,
  getRouteBounds,
  getRouteFallbackCenter,
  getRouteMidpoint,
} from '@utils/routeMap';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'TrackingMap'>;
type RouteMarker = {
  id: string;
  coordinate: Coordinate;
  index?: number;
  type: 'START' | 'END' | 'CHECKPOINT';
};

type MapboxCameraRef = {
  setCamera: (config: {
    centerCoordinate?: Coordinate;
    zoomLevel?: number;
    animationDuration?: number;
  }) => void;
  fitBounds?: (
    ne: Coordinate,
    sw: Coordinate,
    padding?: number | number[],
    animationDuration?: number,
  ) => void;
};

type PersistedTrackingSession = {
  bookingId: number;
  trackingSessionId: number | string;
  localSessionId?: string;
  routeId?: number;
  tourTitle?: string;
  direction?: TrackingDirection;
  status?: TrackingStatus;
  mode?: 'ONLINE' | 'OFFLINE';
  routeRunMode?: RouteRunMode;
};

type TrackingStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
type RouteRunMode = 'FULL_ROUTE_PREVIEW' | 'OUTBOUND_TRACKING' | 'RETURN_TRACKING';

type PersistedTrackingProgress = {
  trackingSessionId: number | string;
  routeId?: number;
  direction: TrackingDirection;
  lastUserCoordinate?: Coordinate;
  lastProgressIndex: number;
  progressPercent: number;
  status: 'ACTIVE' | 'PAUSED';
  updatedAt: string;
};

const ACTIVE_TRACKING_KEY = '@chektrek/active-tracking-session';
const TRACKING_PROGRESS_KEY_PREFIX = '@chektrek/tracking-progress';
const ROUTE_FIT_PADDING = [90, 60, 220, 60];
const MIN_SEND_INTERVAL_MS = 5000;
const MIN_DISTANCE_METERS = 8;
const SIMULATION_INTERVAL_MS = 3000;
const OFF_ROUTE_DISTANCE_METERS = 100;
const SYNC_RETRY_INTERVAL_MS = 10000;

const toFiniteNumber = (value: number | null | undefined, fallback = 0): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const getDistanceMeters = (first: Coordinate, second: Coordinate): number => {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRad(second[1] - first[1]);
  const deltaLongitude = toRad(second[0] - first[0]);
  const startLatitude = toRad(first[1]);
  const endLatitude = toRad(second[1]);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getProjectedCoordinateOnSegment = (
  point: Coordinate,
  start: Coordinate,
  end: Coordinate,
): Coordinate => {
  const segmentLongitude = end[0] - start[0];
  const segmentLatitude = end[1] - start[1];
  const segmentLengthSquared =
    segmentLongitude * segmentLongitude + segmentLatitude * segmentLatitude;

  if (segmentLengthSquared === 0) return start;

  const rawRatio =
    ((point[0] - start[0]) * segmentLongitude + (point[1] - start[1]) * segmentLatitude) /
    segmentLengthSquared;
  const ratio = Math.max(0, Math.min(1, rawRatio));

  return [start[0] + segmentLongitude * ratio, start[1] + segmentLatitude * ratio];
};

const normalizeRouteType = (value?: string): GeneratedRouteType => {
  const normalizedValue = String(value ?? 'ONE_WAY').toUpperCase();
  if (normalizedValue === 'ROUND_TRIP') return 'ROUND_TRIP';
  if (normalizedValue === 'LOOP') return 'LOOP';
  return 'ONE_WAY';
};

const normalizeDirection = (value?: string): TrackingDirection =>
  String(value ?? 'OUTBOUND').toUpperCase() === 'RETURN' ? 'RETURN' : 'OUTBOUND';

const normalizeRouteRunMode = (
  value: unknown,
  direction: TrackingDirection,
  offlineOnly: boolean,
): RouteRunMode => {
  if (value === 'FULL_ROUTE_PREVIEW') return 'FULL_ROUTE_PREVIEW';
  if (value === 'OUTBOUND_TRACKING') return 'OUTBOUND_TRACKING';
  if (value === 'RETURN_TRACKING') return 'RETURN_TRACKING';
  if (offlineOnly) return 'FULL_ROUTE_PREVIEW';
  return direction === 'RETURN' ? 'RETURN_TRACKING' : 'OUTBOUND_TRACKING';
};

const getSimulationCompletionLog = (routeRunMode: RouteRunMode): string => {
  if (routeRunMode === 'FULL_ROUTE_PREVIEW') {
    return '[Simulation] completed because full route ended';
  }
  if (routeRunMode === 'RETURN_TRACKING') {
    return '[Simulation] completed because return ended';
  }
  return '[Simulation] completed because outbound ended';
};

const getTrackingProgressKey = (sessionId: number | string): string =>
  `${TRACKING_PROGRESS_KEY_PREFIX}/${sessionId}`;

const getRouteEndCoordinate = (route?: TourRoute): Coordinate | undefined => {
  if (Number.isFinite(Number(route?.endLongitude)) && Number.isFinite(Number(route?.endLatitude))) {
    return [Number(route?.endLongitude), Number(route?.endLatitude)];
  }

  return undefined;
};

const getNearestCoordinateIndex = (coordinates: Coordinate[], target: Coordinate): number => {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  coordinates.forEach((coordinate, index) => {
    const distance = getDistanceMeters(coordinate, target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

const getDirectionalRouteCoordinates = ({
  coordinates,
  direction,
  route,
  routeType,
}: {
  coordinates: Coordinate[];
  direction: TrackingDirection;
  route: TourRoute;
  routeType: GeneratedRouteType;
}): Coordinate[] => {
  if (coordinates.length < 2) return coordinates;
  if (routeType !== 'ROUND_TRIP') return coordinates;

  const routeEndCoordinate = getRouteEndCoordinate(route);
  const turnaroundIndex = routeEndCoordinate
    ? getNearestCoordinateIndex(coordinates, routeEndCoordinate)
    : Math.floor((coordinates.length - 1) / 2);

  const outboundCoordinates = coordinates.slice(0, turnaroundIndex + 1);
  const returnCoordinates =
    turnaroundIndex < coordinates.length - 1
      ? coordinates.slice(turnaroundIndex)
      : outboundCoordinates.slice().reverse();

  return direction === 'RETURN' ? returnCoordinates : outboundCoordinates;
};

const getTrackingErrorMessage = (error: unknown): string => {
  const maybeAxios = error as { response?: { status?: number; data?: { message?: string } } };
  const backendMessage = maybeAxios.response?.data?.message;
  if (backendMessage) return backendMessage;
  if (maybeAxios.response?.status === 409) return 'Đã có phiên theo dõi đang hoạt động.';
  if (maybeAxios.response?.status === 403 || maybeAxios.response?.status === 400) {
    return 'Booking này không đủ điều kiện theo dõi GPS.';
  }
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
};

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

const getValidTrackingSessionId = (value?: number | string | null): number | null => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const getValidBookingId = (value?: number | string | null): number | null => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const normalizeTrackingStatus = (value?: string | null): TrackingStatus =>
  String(value ?? '').toUpperCase() === 'PAUSED' ? 'PAUSED' : 'ACTIVE';

const getTrackingSosErrorMessage = (error: unknown): string => {
  const maybeAxios = error as { response?: { data?: { message?: string } } };
  return (
    maybeAxios.response?.data?.message ??
    'Không thể gửi SOS lúc này. Vui lòng kiểm tra quyền vị trí và thử lại.'
  );
};

export const TrackingMapScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const routeParams = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const mapboxState = ensureMapboxConfigured();
  const cameraRef = useRef<MapboxCameraRef | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationIndexRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const lastSentCoordinateRef = useRef<Coordinate | null>(null);
  const lastProgressIndexRef = useRef(0);
  const lastUserCoordinateRef = useRef<Coordinate | null>(null);
  const hasFitRouteRef = useRef(false);
  const hasAutoCompletedRef = useRef(false);
  const hasRestoredProgressRef = useRef(false);

  const { bookingId, routeId, tourTitle } = routeParams.params;
  const isOfflineMode = routeParams.params.mode === 'OFFLINE' || routeParams.params.offlineOnly === true;
  const offlineOnly = isOfflineMode;
  const isPreviewMode = routeParams.params.mode === 'PREVIEW';
  const initialTrackingSessionId =
    routeParams.params.trackingSessionId ?? routeParams.params.localTrackingSessionId ?? `local-${Date.now()}`;
  const [trackingSessionId, setTrackingSessionId] = useState<number | string>(initialTrackingSessionId);
  const [numericTrackingSessionId, setNumericTrackingSessionId] = useState<number | null>(
    getValidTrackingSessionId(routeParams.params.trackingSessionId),
  );
  const localSessionId =
    typeof trackingSessionId === 'string' ? trackingSessionId : `session-${trackingSessionId}`;
  const numericBookingId = getValidBookingId(bookingId);
  const direction = useMemo(
    () => normalizeDirection(routeParams.params.direction),
    [routeParams.params.direction],
  );
  const routeRunMode = useMemo(
    () => normalizeRouteRunMode(routeParams.params.routeRunMode, direction, offlineOnly),
    [direction, offlineOnly, routeParams.params.routeRunMode],
  );
  const initialSessionStatus: TrackingStatus =
    routeParams.params.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE';
  const [route, setRoute] = useState<TourRoute | null>(null);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [baseRouteCoordinates, setBaseRouteCoordinates] = useState<Coordinate[]>([]);
  const [displayRouteCoordinates, setDisplayRouteCoordinates] = useState<Coordinate[]>([]);
  const [trackingRouteCoordinates, setTrackingRouteCoordinates] = useState<Coordinate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(Boolean(routeId));
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<TrackingStatus>(initialSessionStatus);
  const isPaused = sessionStatus === 'PAUSED';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isUsingOfflineRoute, setIsUsingOfflineRoute] = useState(false);
  const [isOffline, setIsOffline] = useState(offlineOnly);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('Đã đồng bộ');
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [sosStatusMessage, setSosStatusMessage] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const routeType = useMemo(() => normalizeRouteType(route?.routeType), [route?.routeType]);
  const renderedDisplayRouteCoordinates = isUsingOfflineRoute
    ? baseRouteCoordinates
    : displayRouteCoordinates;
  const isPreviewRouteMode = routeRunMode === 'FULL_ROUTE_PREVIEW';
  const canRenderSosButton =
    !isPreviewMode && numericBookingId !== null && sessionStatus !== 'COMPLETED';
  const headerTitle = tourTitle || route?.routeName || 'Theo dõi GPS';
  const progressRouteCoordinates = isPreviewRouteMode
    ? renderedDisplayRouteCoordinates
    : trackingRouteCoordinates;
  const simulationRouteCoordinates = isPreviewRouteMode
    ? renderedDisplayRouteCoordinates
    : trackingRouteCoordinates;
  const progressPercent = useMemo(() => {
    if (progressRouteCoordinates.length < 2) return 0;
    return (progressIndex / (progressRouteCoordinates.length - 1)) * 100;
  }, [progressIndex, progressRouteCoordinates.length]);
  const statusBadgeLabel =
    sessionStatus === 'PAUSED'
      ? '🟡 Đã tạm dừng'
      : sessionStatus === 'COMPLETED'
        ? '⚫ Hoàn thành'
        : '🟢 Đang theo dõi';
  const hasBackendTrackingSession = numericTrackingSessionId !== null;

  useEffect(() => {
    console.log('[TrackingMap] params debug', {
      bookingId,
      tourId: undefined,
      routeId,
      sessionId: trackingSessionId,
      bookingStatus: routeParams.params.status,
      paymentStatus: undefined,
      mode: routeParams.params.mode ?? 'ONLINE',
    });
  }, [bookingId, routeId, routeParams.params.bookingId, routeParams.params.mode, routeParams.params.status, trackingSessionId]);

  const ensureBackendTrackingSession = useCallback(async (): Promise<number | null> => {
    if (offlineOnly || isPreviewMode) {
      return null;
    }

    if (numericTrackingSessionId !== null) {
      return numericTrackingSessionId;
    }

    if (!numericBookingId) {
      console.warn('[TrackingMap] Skipping latest tracking session request because bookingId is invalid', {
        bookingId,
        routeId,
        sessionId: trackingSessionId,
      });
      console.log('[TrackingMap] cannot create tracking session because bookingId is invalid', {
        bookingId,
        routeId,
        sessionId: trackingSessionId,
      });
      setErrorMessage('Chưa có booking hợp lệ để bắt đầu tracking.');
      return null;
    }

    try {
      const latestSession = await trackingApi.getLatestTrackingSessionByBooking(numericBookingId);
      const latestSessionId = getValidTrackingSessionId(
        latestSession?.trackingSessionId ?? latestSession?.id,
      );
      const latestSessionStatus = String(latestSession?.status ?? '').toUpperCase();

      if (
        latestSessionId !== null &&
        (latestSessionStatus === 'ACTIVE' || latestSessionStatus === 'PAUSED')
      ) {
        const nextSessionStatus = normalizeTrackingStatus(latestSessionStatus);
        setTrackingSessionId(latestSessionId);
        setNumericTrackingSessionId(latestSessionId);
        setSessionStatus(nextSessionStatus);
        await AsyncStorage.setItem(
          ACTIVE_TRACKING_KEY,
          JSON.stringify({
            bookingId: numericBookingId,
            trackingSessionId: latestSessionId,
            localSessionId,
            routeId,
            tourTitle,
            direction: normalizeDirection(latestSession?.direction ?? direction),
            status: nextSessionStatus,
            mode: 'ONLINE',
            routeRunMode,
          } satisfies PersistedTrackingSession),
        );
        return latestSessionId;
      }

      console.log('[TrackingMap] creating tracking session before backend call', {
        bookingId: numericBookingId,
        routeId,
        sessionId: trackingSessionId,
        direction,
      });
      const response = await trackingApi.startTracking(numericBookingId, direction);
      const nextSessionId = getValidTrackingSessionId(response.trackingSessionId);

      if (!nextSessionId) {
        setErrorMessage('Backend không trả về sessionId hợp lệ cho tracking.');
        return null;
      }

      setTrackingSessionId(nextSessionId);
      setNumericTrackingSessionId(nextSessionId);
      await AsyncStorage.setItem(
        ACTIVE_TRACKING_KEY,
        JSON.stringify({
          bookingId: numericBookingId,
          trackingSessionId: nextSessionId,
          localSessionId,
          routeId,
          tourTitle,
          direction,
          status: sessionStatus === 'COMPLETED' ? 'ACTIVE' : sessionStatus,
          mode: 'ONLINE',
          routeRunMode,
        } satisfies PersistedTrackingSession),
      );
      return nextSessionId;
    } catch (error) {
      console.log('[TrackingMap] create tracking session failed:', error);
      setErrorMessage(getTrackingErrorMessage(error));
      return null;
    }
  }, [
    bookingId,
    direction,
    isPreviewMode,
    localSessionId,
    numericBookingId,
    numericTrackingSessionId,
    offlineOnly,
    routeId,
    routeRunMode,
    sessionStatus,
    tourTitle,
    trackingSessionId,
  ]);

  const persistSession = useCallback(async () => {
    const payload: PersistedTrackingSession = {
      bookingId,
      trackingSessionId,
      localSessionId,
      routeId,
      tourTitle,
      direction,
      status: sessionStatus === 'COMPLETED' ? 'ACTIVE' : sessionStatus,
      mode: offlineOnly ? 'OFFLINE' : 'ONLINE',
      routeRunMode,
    };
    await AsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(payload));
  }, [
    bookingId,
    direction,
    localSessionId,
    offlineOnly,
    routeId,
    routeRunMode,
    sessionStatus,
    tourTitle,
    trackingSessionId,
  ]);

  const clearPersistedSession = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIVE_TRACKING_KEY);
  }, []);

  const persistSessionStatus = useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      const payload: PersistedTrackingSession = {
        bookingId,
        trackingSessionId,
        localSessionId,
        routeId,
        tourTitle,
        direction,
        status,
        mode: offlineOnly ? 'OFFLINE' : 'ONLINE',
        routeRunMode,
      };
      await AsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(payload));
    },
    [
      bookingId,
      direction,
      localSessionId,
      offlineOnly,
      routeId,
      routeRunMode,
      tourTitle,
      trackingSessionId,
    ],
  );

  const saveTrackingProgress = useCallback(
    async ({
      coordinate,
      nextProgressIndex,
      nextProgressPercent,
      status = sessionStatus === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    }: {
      coordinate?: Coordinate | null;
      nextProgressIndex: number;
      nextProgressPercent: number;
      status?: 'ACTIVE' | 'PAUSED';
    }) => {
      const payload: PersistedTrackingProgress = {
        trackingSessionId,
        routeId,
        direction,
        lastUserCoordinate: coordinate ?? lastUserCoordinateRef.current ?? undefined,
        lastProgressIndex: nextProgressIndex,
        progressPercent: nextProgressPercent,
        status,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        getTrackingProgressKey(trackingSessionId),
        JSON.stringify(payload),
      );
      console.log('[TrackingPersist] saved state', payload);
    },
    [direction, routeId, sessionStatus, trackingSessionId],
  );

  const loadTrackingProgress = useCallback(async (): Promise<PersistedTrackingProgress | null> => {
    try {
      const rawState = await AsyncStorage.getItem(getTrackingProgressKey(trackingSessionId));
      const state = rawState ? (JSON.parse(rawState) as PersistedTrackingProgress) : null;
      console.log('[TrackingPersist] loaded state', state);
      return state;
    } catch (error) {
      console.log('[TrackingPersist] loaded state', null, error);
      return null;
    }
  }, [trackingSessionId]);

  const refreshPendingSyncCount = useCallback(async () => {
    const pendingPoints = await offlineTrackingQueue.getPendingPoints(trackingSessionId);
    setPendingSyncCount(pendingPoints.length);
    setSyncStatusText(pendingPoints.length > 0 ? 'Đang lưu GPS offline' : 'Đã đồng bộ');
  }, [trackingSessionId]);

  const syncPendingTrackingPoints = useCallback(async () => {
    const pendingPoints = await offlineTrackingQueue.getPendingPoints(trackingSessionId);
    if (pendingPoints.length === 0) {
      setPendingSyncCount(0);
      setSyncStatusText('Đã đồng bộ');
      return;
    }

    setSyncStatusText('Đang đồng bộ GPS');
    const remainingQueue = await offlineTrackingQueue.syncPendingPoints(trackingSessionId);
    const remainingSessionPoints = remainingQueue.filter(
      point => String(point.localSessionId ?? point.trackingSessionId) === String(trackingSessionId),
    );
    setPendingSyncCount(remainingSessionPoints.length);
    setIsOffline(remainingSessionPoints.length > 0);
    setSyncStatusText(remainingSessionPoints.length > 0 ? 'Đang lưu GPS offline' : 'Đã đồng bộ');
  }, [trackingSessionId]);

  const fetchRoute = useCallback(async () => {
    if (!routeId) {
      setIsLoadingRoute(false);
      return;
    }

    setIsLoadingRoute(true);
    setErrorMessage(null);
    hasFitRouteRef.current = false;

    const applyRouteData = (
      routeResponse: TourRoute,
      waypointResponse: RouteWaypoint[],
      decodedCoordinates: Coordinate[],
      usingOfflineRoute: boolean,
    ) => {
      const nextRouteType = normalizeRouteType(routeResponse.routeType);
      const directionalTrackingCoordinates = getDirectionalRouteCoordinates({
        coordinates: decodedCoordinates,
        direction,
        route: routeResponse,
        routeType: nextRouteType,
      });
      const nextDisplayCoordinates = usingOfflineRoute
        ? decodedCoordinates
        : directionalTrackingCoordinates;
      console.log('[TrackingMap] mode', routeParams.params.mode ?? (offlineOnly ? 'OFFLINE' : 'ONLINE'));
      console.log('[TrackingMap] direction =', direction);
      console.log('[TrackingMap] routeRunMode', routeRunMode);
      console.log(
        '[TrackingMap] using reversed route =',
        nextRouteType === 'ROUND_TRIP' && direction === 'RETURN',
      );
      console.log('[TrackingMap] base count', decodedCoordinates.length);
      console.log('[TrackingMap] display count', nextDisplayCoordinates.length);
      console.log('[TrackingMap] tracking count', directionalTrackingCoordinates.length);
      console.log(
        '[TrackingMap] simulation count',
        routeRunMode === 'FULL_ROUTE_PREVIEW'
          ? nextDisplayCoordinates.length
          : directionalTrackingCoordinates.length,
      );
      setRoute(routeResponse);
      setBaseRouteCoordinates(decodedCoordinates);
      setDisplayRouteCoordinates(nextDisplayCoordinates);
      setTrackingRouteCoordinates(directionalTrackingCoordinates);
      setIsUsingOfflineRoute(usingOfflineRoute);
      lastProgressIndexRef.current = 0;
      lastUserCoordinateRef.current = null;
      hasAutoCompletedRef.current = false;
      hasRestoredProgressRef.current = false;
      console.log('[Tracking] reset only for new session', trackingSessionId);
      setProgressIndex(0);
      setIsOffRoute(false);
      setWaypoints(
        waypointResponse
          .filter(
            waypoint =>
              Number.isFinite(Number(waypoint.longitude)) &&
              Number.isFinite(Number(waypoint.latitude)),
          )
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
      );
    };

    if (offlineOnly) {
      console.log('[TrackingMap] offline mode');
      const cachedRoute = await offlineRouteCache.loadRoute(Number(bookingId), routeId);
      if (cachedRoute) {
        console.log('[OfflineRoute] loaded cached route', {
          bookingId,
          routeId,
          points: cachedRoute.decodedCoordinates.length,
        });
        applyRouteData(
          {
            routeId: cachedRoute.routeId,
            routeName: cachedRoute.routeName,
            routeType: cachedRoute.routeType,
            polylineData: cachedRoute.polylineData,
          },
          cachedRoute.waypoints,
          cachedRoute.decodedCoordinates,
          true,
        );
      } else {
        setErrorMessage('Không có lộ trình offline. Hãy tải lộ trình trước khi đi.');
        setRoute(null);
        setBaseRouteCoordinates([]);
        setDisplayRouteCoordinates([]);
        setTrackingRouteCoordinates([]);
        setIsUsingOfflineRoute(false);
        setWaypoints([]);
      }
      setIsLoadingRoute(false);
      return;
    }

    try {
      const [routeResponse, waypointResponse] = await Promise.all([
        routesApi.getRouteById(routeId),
        routesApi.getWaypoints(routeId),
      ]);
      const decodedCoordinates = decodePolylineData(routeResponse.polylineData);
      applyRouteData(routeResponse, waypointResponse, decodedCoordinates, false);
    } catch (error) {
      console.log('[Tracking] route load failed:', error);

      if (isNetworkError(error)) {
        const cachedRoute = await offlineRouteCache.loadRoute(Number(bookingId), routeId);
        if (cachedRoute) {
          applyRouteData(
            {
              routeId: cachedRoute.routeId,
              routeName: cachedRoute.routeName,
              routeType: cachedRoute.routeType,
              polylineData: cachedRoute.polylineData,
            },
            cachedRoute.waypoints,
            cachedRoute.decodedCoordinates,
            true,
          );
          setErrorMessage(null);
          return;
        }

        setErrorMessage('Không có lộ trình offline. Hãy tải lộ trình trước khi đi.');
      } else {
        setErrorMessage('Không thể tải lộ trình GPS.');
      }
      setRoute(null);
      setBaseRouteCoordinates([]);
      setDisplayRouteCoordinates([]);
      setTrackingRouteCoordinates([]);
      setIsUsingOfflineRoute(false);
      lastProgressIndexRef.current = 0;
      lastUserCoordinateRef.current = null;
      setProgressIndex(0);
      setIsOffRoute(false);
      setWaypoints([]);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [
    bookingId,
    direction,
    offlineOnly,
    routeId,
    routeParams.params.mode,
    routeRunMode,
    trackingSessionId,
  ]);

  const fitRouteCamera = useCallback(
    (animationDuration = 700) => {
      if (!cameraRef.current) return;

      const routeDistance = Number(route?.distanceKm);
      const distanceKm = Number.isFinite(routeDistance) ? routeDistance : undefined;
      const targetZoom = getManualRouteZoom(distanceKm);

      if (renderedDisplayRouteCoordinates.length > 1 && targetZoom !== undefined) {
        cameraRef.current.setCamera({
          centerCoordinate: getRouteMidpoint(renderedDisplayRouteCoordinates),
          zoomLevel: targetZoom,
          animationDuration,
        });
        return;
      }

      if (renderedDisplayRouteCoordinates.length > 1) {
        const bounds = getRouteBounds(renderedDisplayRouteCoordinates);
        if (cameraRef.current.fitBounds) {
          cameraRef.current.fitBounds(
            bounds.northEast,
            bounds.southWest,
            ROUTE_FIT_PADDING,
            animationDuration,
          );
        }
        return;
      }

      cameraRef.current.setCamera({
        centerCoordinate:
          currentLocation ??
          renderedDisplayRouteCoordinates[0] ??
          getRouteFallbackCenter(route ?? undefined),
        zoomLevel: currentLocation ? 16 : 12,
        animationDuration,
      });
    },
    [currentLocation, renderedDisplayRouteCoordinates, route],
  );

  const simulatedCoordinates = useMemo(() => {
    return simulationRouteCoordinates;
  }, [simulationRouteCoordinates]);

  const updateRouteProgress = useCallback(
    (userCoordinate: Coordinate) => {
      if (progressRouteCoordinates.length < 2) {
        setIsOffRoute(false);
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Infinity;
      let nearestSegmentDistance = Infinity;
      const nearestTieThresholdMeters = 0.5;

      progressRouteCoordinates.forEach((routeCoordinate, index) => {
        const distance = getDistanceMeters(userCoordinate, routeCoordinate);
        const isNearTie = Math.abs(distance - nearestDistance) <= nearestTieThresholdMeters;
        if (
          distance < nearestDistance ||
          (isNearTie && index >= lastProgressIndexRef.current && index > nearestIndex)
        ) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      for (let index = 1; index < progressRouteCoordinates.length; index += 1) {
        const projectedCoordinate = getProjectedCoordinateOnSegment(
          userCoordinate,
          progressRouteCoordinates[index - 1],
          progressRouteCoordinates[index],
        );
        nearestSegmentDistance = Math.min(
          nearestSegmentDistance,
          getDistanceMeters(userCoordinate, projectedCoordinate),
        );
      }

      console.log('[TrackingMap] nearest route index:', nearestIndex);

      if (Math.min(nearestDistance, nearestSegmentDistance) > OFF_ROUTE_DISTANCE_METERS) {
        setIsOffRoute(true);
        const currentProgressIndex = lastProgressIndexRef.current;
        const currentProgressPercent =
          progressRouteCoordinates.length > 1
            ? (currentProgressIndex / (progressRouteCoordinates.length - 1)) * 100
            : 0;
        console.log('[TrackingMap] progress index:', currentProgressIndex);
        console.log('[TrackingMap] progress percent:', currentProgressPercent);
        console.log('[TrackingMap] progress =', currentProgressPercent);
        return;
      }

      setIsOffRoute(false);
      const nextProgressIndex = Math.max(lastProgressIndexRef.current, nearestIndex);
      lastProgressIndexRef.current = nextProgressIndex;
      lastUserCoordinateRef.current = userCoordinate;
      setProgressIndex(nextProgressIndex);

      const nextProgressPercent =
        progressRouteCoordinates.length > 1
          ? (nextProgressIndex / (progressRouteCoordinates.length - 1)) * 100
          : 0;
      console.log('[TrackingMap] progress index:', nextProgressIndex);
      console.log('[TrackingMap] progress percent:', nextProgressPercent);
      console.log('[TrackingMap] progress =', nextProgressPercent);
      void saveTrackingProgress({
        coordinate: userCoordinate,
        nextProgressIndex,
        nextProgressPercent,
      });
    },
    [progressRouteCoordinates, saveTrackingProgress],
  );

  const sendCoordinate = useCallback(
    async ({
      coordinate,
      accuracy,
      altitude,
      speed,
      forceSend = false,
      source,
    }: {
      coordinate: Coordinate;
      accuracy?: number | null;
      altitude?: number | null;
      speed?: number | null;
      forceSend?: boolean;
      source: 'gps' | 'simulator';
    }) => {
      if (isPreviewMode) {
        return;
      }

      if (isPaused) {
        console.log('[Tracking] gps upload skipped because paused');
        return;
      }

      const nextCoordinate = coordinate;
      setCurrentLocation(nextCoordinate);
      updateRouteProgress(nextCoordinate);
      console.log('[GPS] location update', {
        latitude: nextCoordinate[1],
        longitude: nextCoordinate[0],
        accuracy,
        source,
      });

      const now = Date.now();
      const lastCoordinate = lastSentCoordinateRef.current;
      const distanceMeters = lastCoordinate
        ? getDistanceMeters(lastCoordinate, nextCoordinate)
        : Infinity;

      if (
        !forceSend &&
        (now - lastSentAtRef.current < MIN_SEND_INTERVAL_MS || distanceMeters < MIN_DISTANCE_METERS)
      ) {
        return;
      }

      if (offlineOnly) {
        await offlineTrackingQueue.enqueuePoint({
          latitude: nextCoordinate[1],
          longitude: nextCoordinate[0],
          accuracy: toFiniteNumber(accuracy),
          altitude: toFiniteNumber(altitude),
          speed: toFiniteNumber(speed),
          trackingSessionId,
          localSessionId,
          bookingId,
          routeId,
          progressIndex: lastProgressIndexRef.current,
          direction,
          recordedAt: new Date().toISOString(),
        });
        lastSentAtRef.current = now;
        lastSentCoordinateRef.current = nextCoordinate;
        setIsOffline(true);
        await refreshPendingSyncCount();
        return;
      }

      const backendSessionId = await ensureBackendTrackingSession();
      if (!backendSessionId) {
        console.log('[TrackingMap] skipped sendLocation because backend session is unavailable');
        return;
      }

      const payload: TrackingLocationRequest = {
        trackingSessionId: backendSessionId,
        latitude: nextCoordinate[1],
        longitude: nextCoordinate[0],
        accuracy: toFiniteNumber(accuracy),
        altitude: toFiniteNumber(altitude),
        speed: toFiniteNumber(speed),
      };

      try {
        await trackingApi.sendLocation(payload);
        lastSentAtRef.current = now;
        lastSentCoordinateRef.current = nextCoordinate;
        setIsOffline(false);
        setSyncStatusText(pendingSyncCount > 0 ? 'Đang đồng bộ GPS' : 'Đã đồng bộ');
        console.log('[Tracking] location sent', payload);
      } catch (error) {
        console.log('[Tracking] location send failed:', error);
        if (isNetworkError(error)) {
          await offlineTrackingQueue.enqueuePoint({
            ...payload,
            trackingSessionId,
            localSessionId,
            bookingId,
            routeId,
            progressIndex: lastProgressIndexRef.current,
            direction,
            recordedAt: new Date().toISOString(),
          });
          lastSentAtRef.current = now;
          lastSentCoordinateRef.current = nextCoordinate;
          setIsOffline(true);
          await refreshPendingSyncCount();
          return;
        }
        setErrorMessage(getTrackingErrorMessage(error));
      }
    },
    [
      isPaused,
      bookingId,
      direction,
      ensureBackendTrackingSession,
      isPreviewMode,
      localSessionId,
      offlineOnly,
      pendingSyncCount,
      refreshPendingSyncCount,
      routeId,
      numericTrackingSessionId,
      trackingSessionId,
      updateRouteProgress,
    ],
  );

  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      await sendCoordinate({
        coordinate: [location.coords.longitude, location.coords.latitude],
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        source: 'gps',
      });
    },
    [sendCoordinate],
  );

  const stopWatcher = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    console.log('[Tracking] watcher stopped');
  }, []);

  const stopSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  const sendNextSimulatedCoordinate = useCallback(async () => {
    if (!__DEV__ || simulatedCoordinates.length === 0) return;

    const simulationIndex = simulationIndexRef.current;
    console.log('[Simulation] current index:', simulationIndex);
    const coordinate = simulatedCoordinates[simulationIndex];
    if (!coordinate) {
      console.log('[Simulation] completed at index:', Math.max(0, simulatedCoordinates.length - 1));
      console.log(getSimulationCompletionLog(routeRunMode));
      stopSimulation();
      return;
    }

    await sendCoordinate({
      coordinate,
      accuracy: 5,
      altitude: 0,
      speed: 1.4,
      forceSend: true,
      source: 'simulator',
    });

    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 16,
      animationDuration: 450,
    });

    if (simulationIndex >= simulatedCoordinates.length - 1) {
      console.log('[Simulation] completed at index:', simulationIndex);
      console.log(getSimulationCompletionLog(routeRunMode));
      stopSimulation();
      return;
    }

    simulationIndexRef.current = simulationIndex + 1;
  }, [routeRunMode, sendCoordinate, simulatedCoordinates, stopSimulation]);

  const startSimulation = useCallback(() => {
    if (!__DEV__) return;

    if (simulatedCoordinates.length === 0) {
      Alert.alert('Không có lộ trình', 'Không thể mô phỏng GPS vì route chưa có polyline.');
      return;
    }

    stopWatcher();
    stopSimulation();
    setErrorMessage(null);
    lastSentAtRef.current = 0;
    lastSentCoordinateRef.current = null;
    const savedRouteIndex = Math.min(
      lastProgressIndexRef.current + 1,
      progressRouteCoordinates.length - 1,
    );
    const savedRouteCoordinate = progressRouteCoordinates[savedRouteIndex];
    simulationIndexRef.current = savedRouteCoordinate
      ? Math.min(
          getNearestCoordinateIndex(simulatedCoordinates, savedRouteCoordinate),
          simulatedCoordinates.length - 1,
        )
      : 0;
    console.log('[Simulation] base count:', baseRouteCoordinates.length);
    console.log('[Simulation] display count:', renderedDisplayRouteCoordinates.length);
    console.log('[Simulation] tracking count:', trackingRouteCoordinates.length);
    console.log('[Simulation] simulation count:', simulatedCoordinates.length);
    console.log('[TrackingMap] routeRunMode', routeRunMode);
    console.log('[Simulation] start index:', simulationIndexRef.current);
    if (offlineOnly) {
      console.log('[Simulation] offline route simulation started');
    }
    setIsSimulating(true);

    void sendNextSimulatedCoordinate();
    simulationTimerRef.current = setInterval(() => {
      void sendNextSimulatedCoordinate();
    }, SIMULATION_INTERVAL_MS);
  }, [
    offlineOnly,
    baseRouteCoordinates.length,
    progressRouteCoordinates,
    renderedDisplayRouteCoordinates.length,
    routeRunMode,
    sendNextSimulatedCoordinate,
    simulatedCoordinates,
    stopSimulation,
    stopWatcher,
    trackingRouteCoordinates,
  ]);

  const startWatcher = useCallback(
    async (forceActive = false) => {
      try {
        if (isPreviewMode) {
          stopWatcher();
          stopSimulation();
          return;
        }

        setErrorMessage(null);
        await persistSession();
        if (offlineOnly) {
          console.log('[OfflineTracking] local session started', {
            localSessionId,
            bookingId,
            routeId,
          });
        }
        console.log('[TrackingMap] direction =', direction);

        if (isPaused && !forceActive) {
          console.log('[Tracking] gps upload skipped because paused');
          return;
        }

        if (!offlineOnly) {
          const backendSessionId = await ensureBackendTrackingSession();
          if (!backendSessionId) {
            return;
          }
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        console.log('[Tracking] location permission:', permission.status);
        if (permission.status !== 'granted') {
          setErrorMessage('Bạn cần cấp quyền vị trí để theo dõi GPS.');
          Alert.alert(
            'Không có quyền vị trí',
            'Vui lòng cấp quyền vị trí để bắt đầu theo dõi GPS.',
          );
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setErrorMessage('GPS đang tắt hoặc không khả dụng.');
          Alert.alert('GPS không khả dụng', 'Vui lòng bật dịch vụ vị trí trên thiết bị.');
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await sendLocation(initialLocation);
        cameraRef.current?.setCamera({
          centerCoordinate: [initialLocation.coords.longitude, initialLocation.coords.latitude],
          zoomLevel: 16,
          animationDuration: 500,
        });

        watcherRef.current?.remove();
        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: MIN_SEND_INTERVAL_MS,
            distanceInterval: MIN_DISTANCE_METERS,
          },
          location => {
            void sendLocation(location);
          },
        );
        console.log('[Tracking] watcher restarted');
      } catch (error) {
        console.log('[Tracking] watcher start failed:', error);
        setErrorMessage('Không thể bắt đầu theo dõi GPS.');
        Alert.alert('Không thể bắt đầu GPS', 'Vui lòng kiểm tra GPS và thử lại.');
      }
    },
    [
      bookingId,
      direction,
      ensureBackendTrackingSession,
      isPaused,
      isPreviewMode,
      localSessionId,
      offlineOnly,
      persistSession,
      routeId,
      sendLocation,
      stopSimulation,
      stopWatcher,
    ],
  );

  const pauseTracking = useCallback(async () => {
    console.log('[Tracking] pause pressed');
    const persistPausedState = async () => {
      stopWatcher();
      stopSimulation();
      setSessionStatus('PAUSED');
      if (!offlineOnly) {
        await persistSessionStatus('PAUSED');
      }
      await saveTrackingProgress({
        coordinate: lastUserCoordinateRef.current,
        nextProgressIndex: lastProgressIndexRef.current,
        nextProgressPercent: progressPercent,
        status: 'PAUSED',
      });
    };

    if (offlineOnly) {
      await persistPausedState();
      setErrorMessage('Đang offline. Trạng thái tạm dừng đã được lưu trên thiết bị.');
      return;
    }

    try {
      if (!hasBackendTrackingSession) {
        setErrorMessage('Chua co phien tracking');
        await persistPausedState();
        return;
      }
      await trackingApi.pauseTracking(numericTrackingSessionId);
      await persistPausedState();
    } catch (error) {
      console.log('[Tracking] pause failed:', error);
      if (isNetworkError(error)) {
        setIsOffline(true);
        await persistPausedState();
        setErrorMessage('Đang offline. Trạng thái tạm dừng đã được lưu trên thiết bị.');
        return;
      }
      Alert.alert('Không thể tạm dừng', getTrackingErrorMessage(error));
    }
  }, [
    persistSessionStatus,
    progressPercent,
    offlineOnly,
    saveTrackingProgress,
    stopSimulation,
    stopWatcher,
    hasBackendTrackingSession,
    numericTrackingSessionId,
    trackingSessionId,
  ]);

  const resumeTracking = useCallback(async () => {
    console.log('[Tracking] resume pressed');
    const persistActiveState = async () => {
      const savedState = await loadTrackingProgress();
      if (savedState?.trackingSessionId === trackingSessionId) {
        const restoredIndex = Math.max(
          0,
          Math.min(
            savedState.lastProgressIndex,
            Math.max(0, progressRouteCoordinates.length - 1),
          ),
        );
        lastProgressIndexRef.current = restoredIndex;
        setProgressIndex(restoredIndex);
        if (savedState.lastUserCoordinate) {
          lastUserCoordinateRef.current = savedState.lastUserCoordinate;
          setCurrentLocation(savedState.lastUserCoordinate);
        }
        console.log('[Tracking] resume from index', restoredIndex);
      }
      setSessionStatus('ACTIVE');
      if (!offlineOnly) {
        await persistSessionStatus('ACTIVE');
      }
      await saveTrackingProgress({
        coordinate: savedState?.lastUserCoordinate ?? lastUserCoordinateRef.current,
        nextProgressIndex: savedState?.lastProgressIndex ?? lastProgressIndexRef.current,
        nextProgressPercent:
          savedState?.progressPercent ??
          (progressRouteCoordinates.length > 1
            ? (lastProgressIndexRef.current / (progressRouteCoordinates.length - 1)) * 100
            : 0),
        status: 'ACTIVE',
      });
    };

    if (offlineOnly) {
      await persistActiveState();
      setErrorMessage('Đang offline. GPS tiếp tục ghi nhận và sẽ đồng bộ khi có mạng.');
      return;
    }

    try {
      if (!hasBackendTrackingSession) {
        setErrorMessage('Chua co phien tracking');
        await persistActiveState();
        return;
      }
      await trackingApi.resumeTracking(numericTrackingSessionId);
      await persistActiveState();
    } catch (error) {
      console.log('[Tracking] resume failed:', error);
      if (isNetworkError(error)) {
        setIsOffline(true);
        await persistActiveState();
        setErrorMessage('Đang offline. GPS tiếp tục ghi nhận và sẽ đồng bộ khi có mạng.');
        return;
      }
      Alert.alert('Không thể tiếp tục', getTrackingErrorMessage(error));
    }
  }, [
    loadTrackingProgress,
    offlineOnly,
    persistSessionStatus,
    saveTrackingProgress,
    progressRouteCoordinates.length,
    hasBackendTrackingSession,
    numericTrackingSessionId,
    trackingSessionId,
  ]);

  const completeTracking = useCallback(async () => {
    setIsCompleting(true);
    try {
      stopWatcher();
      stopSimulation();
      if (offlineOnly) {
        setSessionStatus('COMPLETED');
        await clearPersistedSession();
        await AsyncStorage.removeItem(getTrackingProgressKey(trackingSessionId));
        Alert.alert('Đã kết thúc theo dõi', 'Phiên GPS offline đã được lưu trên thiết bị.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OfflineRoutes'),
          },
        ]);
        return;
      }
      if (!hasBackendTrackingSession) {
        Alert.alert('Chua co phien tracking', 'Vui long bat dau tracking truoc khi ket thuc.');
        return;
      }
      await trackingApi.completeTracking(numericTrackingSessionId);
      setSessionStatus('COMPLETED');
      await clearPersistedSession();
      await AsyncStorage.removeItem(getTrackingProgressKey(trackingSessionId));
      Alert.alert('Đã kết thúc theo dõi', 'Phiên GPS đã được hoàn thành.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('BookingDetail', { bookingId: String(bookingId) }),
        },
      ]);
    } catch (error) {
      console.log('[Tracking] complete failed:', error);
      Alert.alert('Không thể kết thúc theo dõi', getTrackingErrorMessage(error));
    } finally {
      setIsCompleting(false);
    }
  }, [
    bookingId,
    clearPersistedSession,
    hasBackendTrackingSession,
    navigation,
    numericTrackingSessionId,
    offlineOnly,
    stopSimulation,
    stopWatcher,
    trackingSessionId,
  ]);

  const requestCompleteTracking = useCallback(() => {
    if (routeType === 'ROUND_TRIP' && progressPercent < -1) {
      Alert.alert(
        'Chưa hoàn thành lộ trình',
        'Bạn chưa đi đủ 90% lộ trình khứ hồi. Bạn vẫn muốn kết thúc theo dõi?',
        [
          { text: 'Tiếp tục theo dõi', style: 'cancel' },
          { text: 'Kết thúc', style: 'destructive', onPress: () => void completeTracking() },
        ],
      );
      return;
    }

    void completeTracking();
  }, [completeTracking, progressPercent, routeType]);

  const getLatestSosLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('LOCATION_PERMISSION_DENIED');
    }

    const currentGpsLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: currentGpsLocation.coords.latitude,
      longitude: currentGpsLocation.coords.longitude,
    };
  }, []);

  const sendTrackingSos = useCallback(async () => {
    setIsSendingSos(true);
    setSosStatusMessage('Đang gửi SOS...');

    try {
      const latestLocation = await getLatestSosLocation();
      const payload: SosPayload = {
        bookingId: numericBookingId ?? undefined,
        trackingSessionId,
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        message: `SOS khẩn cấp từ màn hình tracking${headerTitle ? ` - ${headerTitle}` : ''}.`,
        source: 'API',
        clientCreatedAt: new Date().toISOString(),
      };

      const networkState = await NetInfo.fetch();
      const isConnected =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (isConnected) {
        try {
          await sosApi.createSos(payload);
          setSosStatusMessage('SOS đã gửi tới hệ thống.');
          Alert.alert('Đã gửi SOS', 'Yêu cầu hỗ trợ khẩn cấp đã được gửi kèm vị trí hiện tại.');
          return;
        } catch (error) {
          if (!isNetworkError(error)) {
            throw error;
          }
        }
      }

      await offlineSosQueue.enqueue({
        payload,
        smsMessage: [
          'SOS CHEKTREK',
          payload.message,
          `Booking: ${payload.bookingId ?? 'N/A'}`,
          `Tracking session: ${payload.trackingSessionId ?? 'N/A'}`,
          `Vị trí: ${payload.latitude}, ${payload.longitude}`,
          `Thời gian: ${new Date(payload.clientCreatedAt).toLocaleString('vi-VN')}`,
        ].join('\n'),
      });
      setSosStatusMessage('Mất mạng, SOS đã được lưu để tự gửi lại.');
      Alert.alert(
        'Đã lưu SOS',
        'Thiết bị đang offline. SOS đã được lưu và sẽ tự đồng bộ khi có mạng.',
      );
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error && error.message === 'LOCATION_PERMISSION_DENIED'
          ? 'Không thể gửi SOS vì ứng dụng chưa có quyền vị trí.'
          : getTrackingSosErrorMessage(error);
      setSosStatusMessage(nextErrorMessage);
      Alert.alert('Không thể gửi SOS', nextErrorMessage);
    } finally {
      setIsSendingSos(false);
    }
  }, [getLatestSosLocation, headerTitle, numericBookingId, trackingSessionId]);

  const requestSendSos = useCallback(() => {
    if (!canRenderSosButton || isSendingSos) return;

    Alert.alert(
      'Gửi SOS khẩn cấp?',
      'Hệ thống sẽ gửi yêu cầu hỗ trợ cùng vị trí hiện tại của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi SOS',
          style: 'destructive',
          onPress: () => {
            void sendTrackingSos();
          },
        },
      ],
    );
  }, [canRenderSosButton, isSendingSos, sendTrackingSos]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    void syncPendingTrackingPoints();

    const syncTimer = setInterval(() => {
      void syncPendingTrackingPoints();
    }, SYNC_RETRY_INTERVAL_MS);

    return () => {
      clearInterval(syncTimer);
    };
  }, [syncPendingTrackingPoints]);

  useEffect(() => {
    if (offlineOnly || isPreviewMode) return;

    const restoreSessionStatus = async () => {
      try {
        if (!hasBackendTrackingSession) {
          return;
        }
        const session = await trackingApi.getTrackingSession(numericTrackingSessionId);
        const restoredStatus = String(session.status ?? 'ACTIVE').toUpperCase();
        if (restoredStatus === 'PAUSED') {
          setSessionStatus('PAUSED');
          await persistSessionStatus('PAUSED');
        } else if (restoredStatus === 'COMPLETED') {
          setSessionStatus('COMPLETED');
          await clearPersistedSession();
          await AsyncStorage.removeItem(getTrackingProgressKey(trackingSessionId));
        } else {
          setSessionStatus('ACTIVE');
          await persistSessionStatus('ACTIVE');
        }
      } catch (error) {
        console.log('[Tracking] restore session status failed:', error);
      }
    };

    void restoreSessionStatus();
  }, [
    clearPersistedSession,
    hasBackendTrackingSession,
    isPreviewMode,
    numericTrackingSessionId,
    offlineOnly,
    persistSessionStatus,
    trackingSessionId,
  ]);

  useEffect(() => {
    if (progressRouteCoordinates.length < 2 || hasRestoredProgressRef.current) return;

    const restoreProgress = async () => {
      const localState = await loadTrackingProgress();
      const localStateMatches =
        localState?.trackingSessionId === trackingSessionId &&
        localState.direction === direction &&
        (!routeId || !localState.routeId || localState.routeId === routeId);

      if (
        localStateMatches &&
        (localState.status === 'ACTIVE' || localState.status === 'PAUSED') &&
        Number.isFinite(localState.lastProgressIndex)
      ) {
        const restoredIndex = Math.max(
          0,
          Math.min(localState.lastProgressIndex, progressRouteCoordinates.length - 1),
        );
        lastProgressIndexRef.current = restoredIndex;
        setProgressIndex(restoredIndex);

        if (localState.lastUserCoordinate) {
          lastUserCoordinateRef.current = localState.lastUserCoordinate;
          setCurrentLocation(localState.lastUserCoordinate);
        } else if (progressRouteCoordinates[restoredIndex]) {
          lastUserCoordinateRef.current = progressRouteCoordinates[restoredIndex];
          setCurrentLocation(progressRouteCoordinates[restoredIndex]);
        }

        hasRestoredProgressRef.current = true;
        console.log('[Tracking] resume from index', restoredIndex);
        return;
      }

      if (offlineOnly || isPreviewMode) {
        hasRestoredProgressRef.current = true;
        console.log('[Tracking] resume from index', lastProgressIndexRef.current);
        return;
      }

      try {
        if (!hasBackendTrackingSession) {
          hasRestoredProgressRef.current = true;
          return;
        }
        const latestLocation = await trackingApi.getLatestLocation(numericTrackingSessionId);
        if (latestLocation?.longitude !== undefined && latestLocation?.latitude !== undefined) {
          const latestCoordinate: Coordinate = [
            Number(latestLocation.longitude),
            Number(latestLocation.latitude),
          ];
          const latestIndex = getNearestCoordinateIndex(progressRouteCoordinates, latestCoordinate);
          const restoredIndex = Math.max(lastProgressIndexRef.current, latestIndex);
          const restoredPercent =
            progressRouteCoordinates.length > 1
              ? (restoredIndex / (progressRouteCoordinates.length - 1)) * 100
              : 0;

          lastProgressIndexRef.current = restoredIndex;
          lastUserCoordinateRef.current = latestCoordinate;
          setProgressIndex(restoredIndex);
          setCurrentLocation(latestCoordinate);
          await saveTrackingProgress({
            coordinate: latestCoordinate,
            nextProgressIndex: restoredIndex,
            nextProgressPercent: restoredPercent,
            status: sessionStatus === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
          });
          hasRestoredProgressRef.current = true;
          console.log('[Tracking] restored from backend latest location', latestCoordinate);
          console.log('[Tracking] resume from index', restoredIndex);
          return;
        }
      } catch (error) {
        console.log('[Tracking] backend latest restore failed:', error);
      }

      hasRestoredProgressRef.current = true;
      console.log('[Tracking] resume from index', lastProgressIndexRef.current);
    };

    void restoreProgress();
  }, [
    direction,
    hasBackendTrackingSession,
    isPreviewMode,
    loadTrackingProgress,
    numericTrackingSessionId,
    offlineOnly,
    routeId,
    saveTrackingProgress,
    sessionStatus,
    progressRouteCoordinates,
    trackingSessionId,
  ]);

  useEffect(() => {
    void startWatcher();
    return () => {
      stopWatcher();
      stopSimulation();
    };
  }, [startWatcher, stopSimulation, stopWatcher]);

  useEffect(() => {
    if (isLoadingRoute || hasFitRouteRef.current || currentLocation) return;
    fitRouteCamera();
    hasFitRouteRef.current = true;
  }, [currentLocation, fitRouteCamera, isLoadingRoute]);

  useEffect(() => {
    if (
      !currentLocation ||
      isCompleting ||
      isSimulating ||
      hasAutoCompletedRef.current ||
      progressPercent < 99
    ) {
      return;
    }

    hasAutoCompletedRef.current = true;
    void completeTracking();
  }, [completeTracking, currentLocation, isCompleting, isSimulating, progressPercent]);

  const passedCoordinates = useMemo(
    () => progressRouteCoordinates.slice(0, progressIndex + 1),
    [progressIndex, progressRouteCoordinates],
  );

  const remainingCoordinates = useMemo(
    () => progressRouteCoordinates.slice(progressIndex),
    [progressIndex, progressRouteCoordinates],
  );

  const routeProgressLabel = useMemo(() => {
    if (routeRunMode === 'FULL_ROUTE_PREVIEW') return null;
    if (routeType !== 'ROUND_TRIP') return null;
    return direction === 'RETURN' ? 'RETURN' : 'OUTBOUND';
  }, [direction, routeRunMode, routeType]);

  const displayRouteLine = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: renderedDisplayRouteCoordinates,
      },
    }),
    [renderedDisplayRouteCoordinates],
  );

  const passedRouteLine = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: passedCoordinates,
      },
    }),
    [passedCoordinates],
  );

  const remainingRouteLine = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: remainingCoordinates,
      },
    }),
    [remainingCoordinates],
  );

  const markers = useMemo<RouteMarker[]>(() => {
    const waypointToCoordinate = (waypoint: RouteWaypoint): Coordinate => [
      Number(waypoint.longitude),
      Number(waypoint.latitude),
    ];
    const waypointStart = waypoints.find(
      waypoint => String(waypoint.category ?? '').toUpperCase() === 'START',
    );
    const waypointEnd = waypoints.find(
      waypoint => String(waypoint.category ?? '').toUpperCase() === 'END',
    );
    const startCoordinate =
      routeType === 'ROUND_TRIP'
        ? renderedDisplayRouteCoordinates[0]
        : waypointStart
          ? waypointToCoordinate(waypointStart)
          : renderedDisplayRouteCoordinates[0];
    const endCoordinate =
      routeType === 'ROUND_TRIP'
        ? renderedDisplayRouteCoordinates[renderedDisplayRouteCoordinates.length - 1]
        : waypointEnd
          ? waypointToCoordinate(waypointEnd)
          : renderedDisplayRouteCoordinates[renderedDisplayRouteCoordinates.length - 1];
    const nextMarkers: RouteMarker[] = [];

    if (startCoordinate) {
      nextMarkers.push({ id: 'tracking-route-start', coordinate: startCoordinate, type: 'START' });
    }

    waypoints
      .filter(waypoint => {
        const category = String(waypoint.category ?? '').toUpperCase();
        return category !== 'START' && category !== 'END';
      })
      .forEach((waypoint, index) => {
        nextMarkers.push({
          id: `tracking-waypoint-${waypoint.waypointId}-${index}`,
          coordinate: waypointToCoordinate(waypoint),
          index: index + 1,
          type: 'CHECKPOINT',
        });
      });

    if (
      endCoordinate &&
      (!startCoordinate || endCoordinate.join(',') !== startCoordinate.join(','))
    ) {
      nextMarkers.push({ id: 'tracking-route-end', coordinate: endCoordinate, type: 'END' });
    }

    return nextMarkers;
  }, [renderedDisplayRouteCoordinates, routeType, waypoints]);

  if (!mapboxState.isReady) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing[2] }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.headerSubtitle}>Mapbox unavailable</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <MapboxUnavailableState
          message={mapboxState.error ?? 'Mapbox access token is missing in mobile runtime.'}
        />
      </View>
    );
  }

  logMapboxRenderAttempt('TrackingMapScreen');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing[2] }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.headerSubtitle}>{statusBadgeLabel}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => fitRouteCamera(500)}>
          <Ionicons name="expand" size={19} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Mapbox.MapView style={styles.map} zoomEnabled scrollEnabled pitchEnabled rotateEnabled>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={
            currentLocation ??
            renderedDisplayRouteCoordinates[0] ??
            getRouteFallbackCenter(route ?? undefined)
          }
          zoomLevel={currentLocation ? 16 : 12}
        />
        {isUsingOfflineRoute && renderedDisplayRouteCoordinates.length > 1 && (
          <Mapbox.ShapeSource id="displayRouteSource" shape={displayRouteLine}>
            <Mapbox.LineLayer
              id="displayRouteLine"
              style={{
                lineColor: '#1E88E5',
                lineWidth: 5,
                lineOpacity: 0.55,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {passedCoordinates.length > 1 && (
          <Mapbox.ShapeSource id="passedRouteSource" shape={passedRouteLine}>
            <Mapbox.LineLayer
              id="passedRouteLine"
              style={{
                lineColor: '#8A8F98',
                lineWidth: 6,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {remainingCoordinates.length > 1 && (
          <Mapbox.ShapeSource id="remainingRouteSource" shape={remainingRouteLine}>
            <Mapbox.LineLayer
              id="remainingRouteLine"
              style={{
                lineColor: '#1E88E5',
                lineWidth: 6,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        <Mapbox.UserLocation visible={true} />
        {currentLocation && (
          <Mapbox.PointAnnotation id="tracking-current-location" coordinate={currentLocation}>
            <View style={styles.currentLocationOuter}>
              <View style={styles.currentLocationMarker}>
                <Ionicons name="navigate" size={14} color={Colors.surfaceWhite} />
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}
        {markers.map(marker => (
          <Mapbox.PointAnnotation key={marker.id} id={marker.id} coordinate={marker.coordinate}>
            {marker.type === 'CHECKPOINT' ? (
              <View style={styles.checkpointMarker}>
                <Text style={styles.checkpointText}>{marker.index}</Text>
              </View>
            ) : (
              <View style={styles.pinWrap}>
                <View
                  style={[
                    styles.pinHead,
                    marker.type === 'START' && styles.startMarker,
                    marker.type === 'END' && styles.endMarker,
                  ]}
                >
                  <Ionicons
                    name={marker.type === 'START' ? 'play' : 'flag'}
                    size={14}
                    color={Colors.surfaceWhite}
                  />
                </View>
                <View
                  style={[
                    styles.pinTip,
                    marker.type === 'START' && styles.startPinTip,
                    marker.type === 'END' && styles.endPinTip,
                  ]}
                />
              </View>
            )}
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {isLoadingRoute ? (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải lộ trình...</Text>
        </View>
      ) : null}

      {isUsingOfflineRoute ? (
        <View style={[styles.offlineRouteBadge, { top: insets.top + 132 }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.warningAmber} />
          <Text style={styles.offlineRouteText}>Offline route</Text>
        </View>
      ) : null}

      <View style={[styles.progressPill, { top: insets.top + 78 }]}>
        <Text style={styles.progressText}>Đã hoàn thành: {Math.round(progressPercent)}%</Text>
        {routeProgressLabel ? (
          <Text style={styles.progressPhaseText}>{routeProgressLabel}</Text>
        ) : null}
        {isOffRoute ? <Text style={styles.offRouteText}>Bạn đang lệch khỏi lộ trình</Text> : null}
      </View>

      {canRenderSosButton ? (
        <View
          style={[
            styles.sosOverlay,
            {
              right: Spacing[4],
              bottom: panelHeight + insets.bottom + Spacing[5],
            },
          ]}
          pointerEvents="box-none"
        >
          {sosStatusMessage ? (
            <View style={styles.sosStatusBadge}>
              <Text style={styles.sosStatusText}>{sosStatusMessage}</Text>
            </View>
          ) : null}
          <View style={isSendingSos ? styles.sosButtonBusy : undefined}>
            <EmergencyButton onPress={requestSendSos} isActive={isSendingSos} />
            {isSendingSos ? (
              <View style={styles.sosLoadingOverlay}>
                <ActivityIndicator size="small" color={Colors.surfaceWhite} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View
        style={[styles.panel, { paddingBottom: insets.bottom + Spacing[4] }]}
        onLayout={event => {
          setPanelHeight(event.nativeEvent.layout.height);
        }}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.activeDot,
              sessionStatus === 'PAUSED' && styles.pausedDot,
              sessionStatus === 'COMPLETED' && styles.completedDot,
            ]}
          />
          <Text style={styles.statusText}>{statusBadgeLabel}</Text>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <View style={styles.syncRow}>
          <Ionicons
            name={
              isOffline || pendingSyncCount > 0 ? 'cloud-offline-outline' : 'cloud-done-outline'
            }
            size={18}
            color={isOffline || pendingSyncCount > 0 ? Colors.warningAmber : Colors.successGreen}
          />
          <Text style={styles.syncText}>
            {syncStatusText}
            {pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ''}
          </Text>
        </View>
        {__DEV__ && sessionStatus === 'ACTIVE' ? (
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={isSimulating ? stopSimulation : startSimulation}
            activeOpacity={0.85}
            >
              <Ionicons
                name={isSimulating ? 'pause-circle-outline' : 'walk-outline'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.simulateText}>
                {isSimulating ? '[DEV] Stop Simulation' : '[DEV] Simulate GPS'}
              </Text>
            </TouchableOpacity>
        ) : null}
        {sessionStatus === 'ACTIVE' ? (
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={pauseTracking}
            disabled={isCompleting}
            activeOpacity={0.85}
          >
            <Ionicons name="pause-circle-outline" size={20} color={Colors.onPrimary} />
            <Text style={styles.actionButtonText}>Tạm dừng</Text>
          </TouchableOpacity>
        ) : null}
        {sessionStatus === 'PAUSED' ? (
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={resumeTracking}
            disabled={isCompleting}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle-outline" size={20} color={Colors.onPrimary} />
            <Text style={styles.actionButtonText}>Tiếp tục</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={requestCompleteTracking}
          disabled={isCompleting}
          activeOpacity={0.85}
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="stop-circle-outline" size={20} color={Colors.onPrimary} />
              <Text style={styles.completeText}>Kết thúc theo dõi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    minHeight: 64,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    zIndex: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.successGreen,
  },
  map: { flex: 1 },
  loadingPill: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.md as object),
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  offlineRouteBadge: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 34,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.warningAmber + '55',
    ...(Shadows.md as object),
  },
  offlineRouteText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.warningAmber,
  },
  progressPill: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    minHeight: 44,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...(Shadows.md as object),
  },
  progressText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  progressPhaseText: {
    marginTop: 2,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  offRouteText: {
    marginTop: 2,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  sosOverlay: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 20,
    elevation: 20,
  },
  sosStatusBadge: {
    maxWidth: 220,
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    backgroundColor: Colors.onSurface,
    ...(Shadows.md as object),
  },
  sosStatusText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.surfaceWhite,
    textAlign: 'right',
  },
  sosButtonBusy: {
    opacity: 0.96,
  },
  sosLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  panel: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    bottom: 0,
    padding: Spacing[4],
    gap: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    ...(Shadows.lg as object),
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  syncText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.successGreen,
  },
  pausedDot: {
    backgroundColor: Colors.warningAmber,
  },
  completedDot: {
    backgroundColor: Colors.outline,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  simulateButton: {
    minHeight: 48,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '35',
  },
  simulateText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  pauseButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.warningAmber,
  },
  resumeButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.successGreen,
  },
  completeButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.error,
  },
  completeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  actionButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  pinWrap: { alignItems: 'center', justifyContent: 'center' },
  pinHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  startMarker: { backgroundColor: Colors.successGreen },
  endMarker: { backgroundColor: Colors.error },
  startEndMarker: { backgroundColor: Colors.successGreen },
  turnaroundMarker: { backgroundColor: Colors.warningAmber },
  startEndMarkerText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.surfaceWhite,
  },
  pinTip: {
    width: 10,
    height: 10,
    marginTop: -5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  startPinTip: { backgroundColor: Colors.successGreen },
  endPinTip: { backgroundColor: Colors.error },
  startEndPinTip: { backgroundColor: Colors.successGreen },
  turnaroundPinTip: { backgroundColor: Colors.warningAmber },
  checkpointMarker: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  checkpointText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.surfaceWhite,
  },
  currentLocationOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 97, 165, 0.18)',
  },
  currentLocationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
});
