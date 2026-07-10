import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapboxUnavailableState } from '@components/common/MapboxUnavailableState';
import { RootStackParamList } from '@navigation/types';
import {
  ProviderSosAlert,
  ProviderSosStatus,
  hasValidSosCoordinates,
  sosApi,
} from '@services/api/sos.api';
import { ensureMapboxConfigured, logMapboxRenderAttempt } from '@services/mapbox/mapboxConfig';
import { Colors } from '@theme/colors';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { FontFamily, FontSize } from '@theme/typography';
type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'ProviderSosMap'>;
type Coordinate = [number, number];

const STATUS_CONFIG: Record<
  ProviderSosStatus,
  { label: string; background: string; foreground: string }
> = {
  PENDING: {
    label: 'Khẩn cấp',
    background: Colors.errorContainer,
    foreground: Colors.error,
  },
  ACKNOWLEDGED: {
    label: 'Đã nhận',
    background: Colors.warningAmber + '20',
    foreground: Colors.warningAmber,
  },
  RESOLVED: {
    label: 'Đã xử lý',
    background: Colors.successGreen + '20',
    foreground: Colors.successGreen,
  },
  CANCELLED: {
    label: 'Đã hủy',
    background: Colors.surfaceContainer,
    foreground: Colors.onSurfaceVariant,
  },
};

const formatDateTime = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (numberValue: number) => String(numberValue).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const ProviderSosMapScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const mapboxState = ensureMapboxConfigured();
  const [alertDetails, setAlertDetails] = useState<ProviderSosAlert | null>(null);
  const [status, setStatus] = useState<ProviderSosStatus>('PENDING');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAlert = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextAlert = await sosApi.getProviderSosById(route.params.sosId);
      if (!nextAlert) {
        setAlertDetails(null);
        setErrorMessage('Không tìm thấy cảnh báo SOS này từ hệ thống.');
        return;
      }

      setAlertDetails(nextAlert);
      setStatus(nextAlert.status);

      if (!hasValidSosCoordinates(nextAlert)) {
        setErrorMessage('Hệ thống không trả về vị trí hợp lệ cho SOS này.');
      }
    } catch (error) {
      console.error('[ProviderSOS] failed to load alert details:', error);
      setAlertDetails(null);
      setErrorMessage('Không thể tải vị trí SOS từ hệ thống. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [route.params.sosId]);

  useEffect(() => {
    void loadAlert();
  }, [loadAlert]);

  const coordinate = useMemo<Coordinate | null>(() => {
    if (!hasValidSosCoordinates(alertDetails)) {
      return null;
    }

    return [alertDetails.longitude, alertDetails.latitude];
  }, [alertDetails]);

  const statusConfig = STATUS_CONFIG[status];
  const canAcknowledge = status === 'PENDING';
  const canResolve = status === 'ACKNOWLEDGED';
  const shouldRenderMapView = mapboxState.isReady && coordinate !== null;

  if (shouldRenderMapView) {
    logMapboxRenderAttempt('ProviderSosMapScreen');
  }

  const openGoogleMaps = async () => {
    if (!hasValidSosCoordinates(alertDetails)) {
      Alert.alert('Không có vị trí', 'Hệ thống chưa cung cấp vị trí hợp lệ cho cảnh báo SOS này.');
      return;
    }

    const url = `https://maps.google.com/?q=${alertDetails.latitude},${alertDetails.longitude}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Không thể mở Google Maps', 'Vui lòng thử lại sau.');
    }
  };

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      if (canAcknowledge) {
        console.log('[ProviderSOS] acknowledge', route.params.sosId);
        await sosApi.acknowledgeSos(route.params.sosId);
      } else if (canResolve) {
        console.log('[ProviderSOS] resolve', route.params.sosId);
        await sosApi.resolveSos(route.params.sosId);
      }

      await loadAlert();
    } catch (error) {
      console.error('[ProviderSOS] map action failed:', error);
      Alert.alert(
        'Không thể cập nhật cảnh báo SOS',
        canAcknowledge
          ? 'Không thể đánh dấu đã nhận. Vui lòng thử lại.'
          : 'Không thể đánh dấu đã xử lý. Vui lòng thử lại.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.root}>
      {shouldRenderMapView ? (
        <Mapbox.MapView style={styles.map} zoomEnabled scrollEnabled pitchEnabled rotateEnabled>
          <Mapbox.Camera centerCoordinate={coordinate!} zoomLevel={14} animationDuration={500} />
          <Mapbox.PointAnnotation id="provider-sos-marker" coordinate={coordinate!}>
            <View style={styles.markerOuter}>
              <View style={styles.markerInner}>
                <Ionicons name="warning" size={18} color={Colors.surfaceWhite} />
              </View>
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      ) : (
        <View style={styles.mapFallback}>
          {!mapboxState.isReady ? (
            <MapboxUnavailableState
              message={mapboxState.error ?? 'Mapbox access token is missing in mobile runtime.'}
            />
          ) : isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="warning-outline" size={44} color={Colors.error} />
              <Text style={styles.mapFallbackTitle}>Không thể hiển thị bản đồ SOS</Text>
              <Text style={styles.mapFallbackText}>
                {errorMessage ?? 'Hệ thống chưa cung cấp vị trí hợp lệ cho cảnh báo này.'}
              </Text>
              <Pressable style={styles.retryButton} onPress={() => void loadAlert()}>
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + Spacing[2] }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bản đồ SOS</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => void openGoogleMaps()}>
          <Ionicons name="logo-google" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.overlayCard, { paddingBottom: insets.bottom + Spacing[4] }]}>
        <View style={styles.overlayHeader}>
          <View style={styles.overlayTitleBlock}>
            <Text style={styles.trekkerName}>{alertDetails?.trekkerName ?? 'Trekker'}</Text>
            {alertDetails?.tourTitle ? (
              <Text style={styles.tourTitle}>{alertDetails.tourTitle}</Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.badgeText, { color: statusConfig.foreground }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {alertDetails?.trekkerEmail ? (
          <Text style={styles.emailText}>{alertDetails.trekkerEmail}</Text>
        ) : null}

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={17} color={Colors.primary} />
          <Text style={styles.detailText}>{formatDateTime(alertDetails?.createdAt)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={17} color={Colors.primary} />
          <Text style={styles.detailText}>
            {hasValidSosCoordinates(alertDetails)
              ? `${alertDetails.latitude}, ${alertDetails.longitude}`
              : 'Vị trí không khả dụng'}
          </Text>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>Tin nhắn</Text>
          <Text style={styles.messageText}>{alertDetails?.message || '--'}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.googleMapsButton}
            onPress={() => void openGoogleMaps()}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
            <Text style={styles.googleMapsText}>Mở bằng Google Maps</Text>
          </TouchableOpacity>

          {canAcknowledge || canResolve ? (
            <TouchableOpacity
              style={[styles.actionButton, canResolve && styles.resolveButton]}
              onPress={() => void handleUpdateStatus()}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {canAcknowledge ? 'Đã nhận' : 'Đã xử lý'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    backgroundColor: Colors.surfaceContainer,
    gap: Spacing[3],
  },
  mapFallbackTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  mapFallbackText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 22,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
  header: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.md as object),
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  markerOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.18)',
  },
  markerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sosRed,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  overlayCard: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    bottom: 0,
    padding: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    gap: Spacing[3],
    ...(Shadows.lg as object),
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  overlayTitleBlock: { flex: 1 },
  trekkerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
  },
  tourTitle: {
    marginTop: 3,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  emailText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  detailText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  messageBox: {
    padding: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '0D',
  },
  messageLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  messageText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  googleMapsButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '35',
  },
  googleMapsText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  actionButton: {
    minWidth: 108,
    minHeight: 44,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningAmber,
  },
  resolveButton: {
    backgroundColor: Colors.successGreen,
  },
  actionButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
});
