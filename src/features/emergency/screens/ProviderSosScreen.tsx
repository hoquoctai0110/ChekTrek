import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import {
  ProviderSosAlert,
  ProviderSosStatus,
  hasValidSosCoordinates,
  sosApi,
} from '@services/api/sos.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type SosFilter = 'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';

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

const FILTER_OPTIONS: Array<{ key: SosFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Khẩn cấp' },
  { key: 'ACKNOWLEDGED', label: 'Đã nhận' },
  { key: 'RESOLVED', label: 'Đã xử lý' },
];

const formatDateTime = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (numberValue: number) => String(numberValue).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getStatusConfig = (status: ProviderSosStatus) =>
  STATUS_CONFIG[status] ?? {
    label: status,
    background: Colors.surfaceContainer,
    foreground: Colors.onSurfaceVariant,
  };

const formatCoordinates = (alert: ProviderSosAlert): string =>
  hasValidSosCoordinates(alert)
    ? `${alert.latitude}, ${alert.longitude}`
    : 'Vị trí không khả dụng';

export const ProviderSosScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<ProviderSosAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<SosFilter>('ALL');

  const loadAlerts = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await sosApi.getProviderSos();
      console.log('[ProviderSOS] loaded alerts', response);
      setAlerts(response);
    } catch (error) {
      console.error('[ProviderSOS] failed to load alerts:', error);
      setErrorMessage('Không thể tải cảnh báo SOS. Vui lòng thử lại.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

  const filteredAlerts = useMemo(
    () => alerts.filter(alert => filter === 'ALL' || alert.status === filter),
    [alerts, filter],
  );

  const openMap = useCallback(
    (alert: ProviderSosAlert) => {
      console.log('[ProviderSOS] open map', alert.sosId);
      navigation.navigate('ProviderSosMap', {
        sosId: alert.sosId,
      });
    },
    [navigation],
  );

  const renderAlert = ({ item }: { item: ProviderSosAlert }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openMap(item)} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.trekkerName}>{item.trekkerName ?? 'Trekker'}</Text>
            {item.trekkerEmail ? (
              <Text style={styles.trekkerEmail}>{item.trekkerEmail}</Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.badgeText, { color: statusConfig.foreground }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.tourTitle ? <Text style={styles.tourTitle}>{item.tourTitle}</Text> : null}

        <View style={styles.infoBlock}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDateTime(item.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{formatCoordinates(item)}</Text>
          </View>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>Tin nhắn</Text>
          <Text style={styles.messageText}>{item.message || '--'}</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => openMap(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
            <Text style={styles.mapButtonText}>Xem bản đồ</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải cảnh báo SOS...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAlerts()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item, index) => item.sosId || `provider-sos-${index}`}
        renderItem={renderAlert}
        contentContainerStyle={[
          styles.listContent,
          filteredAlerts.length === 0 && styles.emptyListContent,
          { paddingBottom: insets.bottom + Spacing[6] },
        ]}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterChip, filter === option.key && styles.filterChipActive]}
                onPress={() => setFilter(option.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === option.key && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Ionicons name="warning-outline" size={60} color={Colors.outlineVariant} />
            <Text style={styles.stateTitle}>Chưa có cảnh báo SOS</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cảnh báo SOS</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.onSurface },
  headerSpacer: { width: 40 },
  listContent: { padding: Spacing[4] },
  emptyListContent: { flexGrow: 1 },
  separator: { height: Spacing[3] },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  card: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  titleBlock: { flex: 1 },
  trekkerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  trekkerEmail: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  tourTitle: {
    marginTop: Spacing[3],
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  infoBlock: { marginTop: Spacing[3], gap: Spacing[2] },
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
    marginTop: Spacing[4],
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
    color: Colors.onSurface,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  mapButton: {
    minHeight: 42,
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
  mapButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  stateTitle: {
    marginTop: Spacing[3],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateText: {
    marginTop: Spacing[2],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { fontFamily: FontFamily.semiBold, color: Colors.onPrimary },
});
