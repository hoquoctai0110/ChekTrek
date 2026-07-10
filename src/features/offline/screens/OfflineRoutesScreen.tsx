import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { OfflineRouteCacheEntry, offlineRouteCache } from '@services/offline/offlineRouteCache';
import { TrackingDirection } from '@services/api/tracking.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type PersistedTrackingSession = {
  bookingId: number;
  trackingSessionId: number | string;
  localSessionId?: string;
  localTrackingSessionId?: string;
  routeId?: number;
  tourTitle?: string;
  direction?: TrackingDirection;
  status?: 'ACTIVE' | 'PAUSED';
  mode?: 'ONLINE' | 'OFFLINE';
  routeRunMode?: 'FULL_ROUTE_PREVIEW' | 'OUTBOUND_TRACKING' | 'RETURN_TRACKING';
};

const ACTIVE_TRACKING_KEY = '@chektrek/active-tracking-session';

const getCachedRouteId = (cachedRoute: OfflineRouteCacheEntry): string =>
  `${cachedRoute.bookingId}:${cachedRoute.routeId}`;

const createLocalSessionId = (): string => `local-${Date.now()}`;

const formatDownloadedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OfflineRoutesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<OfflineRouteCacheEntry[]>([]);
  const [activeTracking, setActiveTracking] = useState<PersistedTrackingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRoutes = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [cachedRoutes, rawSession] = await Promise.all([
        offlineRouteCache.listRoutes(),
        AsyncStorage.getItem(ACTIVE_TRACKING_KEY),
      ]);
      setRoutes(cachedRoutes);
      setActiveTracking(rawSession ? (JSON.parse(rawSession) as PersistedTrackingSession) : null);
      console.log('[OfflineRoutes] loaded cached routes', { count: cachedRoutes.length });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const openOfflineRoute = (cachedRoute: OfflineRouteCacheEntry, startTracking = true) => {
    const matchingSession =
      activeTracking?.bookingId === cachedRoute.bookingId &&
      (!activeTracking.routeId || activeTracking.routeId === cachedRoute.routeId)
        ? activeTracking
        : null;
    const localSessionId =
      matchingSession?.localSessionId ??
      (typeof matchingSession?.trackingSessionId === 'string'
        ? matchingSession.trackingSessionId
        : createLocalSessionId());
    const session: PersistedTrackingSession = {
      bookingId: cachedRoute.bookingId,
      trackingSessionId: localSessionId,
      localSessionId,
      localTrackingSessionId: localSessionId,
      routeId: cachedRoute.routeId,
      tourTitle: cachedRoute.tourTitle ?? cachedRoute.routeName ?? 'Lộ trình offline',
      direction: matchingSession?.direction ?? 'OUTBOUND',
      status: startTracking ? 'ACTIVE' : (matchingSession?.status ?? 'PAUSED'),
      mode: 'OFFLINE',
      routeRunMode: matchingSession?.routeRunMode ?? 'FULL_ROUTE_PREVIEW',
    };

    if (startTracking) {
      void AsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(session));
      setActiveTracking(session);
      console.log('[OfflineTracking] local session started', {
        localSessionId,
        bookingId: cachedRoute.bookingId,
        routeId: cachedRoute.routeId,
      });
    }

    navigation.navigate('TrackingMap', {
      mode: 'OFFLINE',
      cachedRouteId: getCachedRouteId(cachedRoute),
      bookingId: cachedRoute.bookingId,
      trackingSessionId: session.trackingSessionId,
      localTrackingSessionId: localSessionId,
      routeId: cachedRoute.routeId,
      tourTitle: cachedRoute.tourTitle ?? cachedRoute.routeName ?? 'Lộ trình offline',
      direction: session.direction,
      routeRunMode: session.routeRunMode,
      status: session.status,
      offlineOnly: true,
    });
  };

  const renderRoute = (cachedRoute: OfflineRouteCacheEntry) => (
    <View key={`${cachedRoute.bookingId}-${cachedRoute.routeId}`} style={styles.routeCard}>
      <View style={styles.routeIcon}>
        <Ionicons name="map-outline" size={22} color={Colors.primary} />
      </View>
      <View style={styles.routeContent}>
        <Text style={styles.routeTitle} numberOfLines={1}>
          {cachedRoute.tourTitle ?? cachedRoute.routeName ?? 'Lộ trình offline'}
        </Text>
        <Text style={styles.routeMeta}>
          Booking #{cachedRoute.bookingId} · Route #{cachedRoute.routeId}
        </Text>
        <Text style={styles.routeMeta}>
          {cachedRoute.decodedCoordinates.length} điểm · {cachedRoute.routeType ?? 'ONE_WAY'}
        </Text>
        <Text style={styles.downloadedAt}>
          Đã tải: {formatDownloadedAt(cachedRoute.downloadedAt)}
        </Text>
      </View>
      <View style={styles.routeActions}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => openOfflineRoute(cachedRoute, false)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryActionText}>Xem lộ trình</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => openOfflineRoute(cachedRoute, true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionText}>Bắt đầu tracking offline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lộ trình đã tải</Text>
          <Text style={styles.headerSubtitle}>Bạn đang ở chế độ offline</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => loadRoutes(false)}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={18} color={Colors.warningAmber} />
        <Text style={styles.offlineBannerText}>Bạn đang ở chế độ offline</Text>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            routes.length === 0 && styles.emptyContent,
            { paddingBottom: insets.bottom + Spacing[6] },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                void loadRoutes(false);
              }}
            />
          }
        >
          {routes.length > 0 ? (
            routes.map(renderRoute)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={52} color={Colors.outline} />
              <Text style={styles.emptyTitle}>Chưa có lộ trình offline</Text>
              <Text style={styles.emptyText}>
                Hãy tải lộ trình khi có mạng trước khi bắt đầu chuyến đi.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    minHeight: 72,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.warningAmber,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  offlineBanner: {
    margin: Spacing[4],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.warningAmber + '14',
    borderWidth: 1,
    borderColor: Colors.warningAmber + '45',
  },
  offlineBannerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  content: { paddingHorizontal: Spacing[4], gap: Spacing[3] },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  routeCard: {
    minHeight: 108,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  routeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '12',
  },
  routeContent: { flex: 1 },
  routeActions: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  secondaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    backgroundColor: Colors.surfaceWhite,
  },
  primaryAction: {
    flex: 1.4,
    minHeight: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  secondaryActionText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  primaryActionText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  routeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  routeMeta: {
    marginTop: 3,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  downloadedAt: {
    marginTop: 5,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
  },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: Spacing[6] },
  emptyTitle: {
    marginTop: Spacing[3],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  emptyText: {
    marginTop: Spacing[2],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
