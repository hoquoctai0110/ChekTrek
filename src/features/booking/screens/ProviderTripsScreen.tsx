import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { SafeScreen } from '@components/common/SafeScreen';
import { RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { bookingsApi, MyBooking } from '@services/api/bookings.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; background: string; foreground: string }
> = {
  PENDING: {
    label: 'Chờ xác nhận',
    background: Colors.warningAmber + '20',
    foreground: Colors.warningAmber,
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    background: Colors.successGreen + '20',
    foreground: Colors.successGreen,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    background: Colors.primary + '18',
    foreground: Colors.primary,
  },
  CANCELLED: {
    label: 'Đã hủy',
    background: Colors.errorContainer,
    foreground: Colors.error,
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

const formatMoney = (amount?: number, currency?: string): string => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const safeCurrency = typeof currency === 'string' && currency.trim() ? currency : 'VND';
  if (safeCurrency.toUpperCase() === 'VND') {
    return `${Math.round(safeAmount).toLocaleString('vi-VN')} ₫`;
  }
  return `${safeAmount.toLocaleString('vi-VN')} ${safeCurrency}`;
};

const getStatusConfig = (status?: string) =>
  STATUS_CONFIG[(status ?? '').toUpperCase() as BookingStatus] ?? {
    label: status ?? 'Không xác định',
    background: Colors.surfaceContainer,
    foreground: Colors.onSurfaceVariant,
  };

const getErrorMessage = (error: unknown): string => {
  const status = Number((error as { response?: { status?: number } })?.response?.status);
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản hiện không có quyền xem chuyến đi của nhà cung cấp.';
  if (status === 404) {
    return 'Chức năng quản lý chuyến đi cho nhà cung cấp đang được phát triển.';
  }
  if (status >= 500) return 'Máy chủ đang bận. Vui lòng thử lại sau.';
  return 'Không thể tải danh sách chuyến đi. Vui lòng thử lại.';
};

export const ProviderTripsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore(state => state.user);
  const tokens = useAuthStore(state => state.tokens);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setErrorMessage(null);

    try {
      if (__DEV__) {
        console.log('[ProviderTrips] auth context:', {
          role: user?.role,
          userId: user?.id,
          email: user?.email,
          hasProviderProfile: false,
          tourProviderId: null,
          hasAccessToken: Boolean(tokens?.accessToken),
        });
      }

      const response = await bookingsApi.getProviderBookings();
      const items = Array.isArray(response) ? response : [];
      if (__DEV__) {
        console.log('[ProviderTrips] GET /bookings/provider items:', items.length);
      }
      setBookings(items);
    } catch (error) {
      console.error('[ProviderTrips] failed to load provider trips:', error);
      setBookings([]);
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (mode === 'initial') setIsLoading(false);
      if (mode === 'refresh') setIsRefreshing(false);
    }
  }, [tokens?.accessToken, user?.email, user?.id, user?.role]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        if (!isActive) return;
        await loadBookings('initial');
      };

      void run();

      return () => {
        isActive = false;
      };
    }, [loadBookings]),
  );

  const renderBooking = ({ item }: { item: MyBooking }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (item.id) {
            navigation.navigate('BookingDetail', { bookingId: item.id });
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.bookingId}>Booking #{item.id || '--'}</Text>
            <Text style={styles.tourTitle} numberOfLines={2}>
              {item.tourTitle || 'Chuyến đi chưa có tên'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.badgeText, { color: statusConfig.foreground }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDateTime(item.scheduleDateTime)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{Number(item.numberOfPeople ?? 0)} người</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={17} color={Colors.primary} />
            <Text style={styles.amountText}>{formatMoney(item.totalAmount, item.currency)}</Text>
          </View>
          {item.trekkerName || item.trekkerEmail ? (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={17} color={Colors.primary} />
              <Text style={styles.detailText}>
                {item.trekkerName ?? item.trekkerEmail ?? 'Trekker'}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (user?.role !== 'TOUR_PROVIDER') {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.warningAmber} />
          <Text style={styles.stateTitle}>Màn hình không phù hợp với vai trò hiện tại</Text>
          <Text style={styles.stateText}>
            Chuyến đi của nhà cung cấp chỉ khả dụng cho tài khoản TOUR_PROVIDER.
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải chuyến đi của nhà cung cấp...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadBookings('initial')}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={bookings}
        keyExtractor={(item, index) => item.id || `provider-trip-${index}`}
        renderItem={renderBooking}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadBookings('refresh')}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          bookings.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Ionicons name="trail-sign-outline" size={60} color={Colors.outlineVariant} />
            <Text style={styles.stateTitle}>Chưa có chuyến đi nào</Text>
            <Text style={styles.stateText}>
              Khi có booking hoặc lịch khởi hành thuộc tour của bạn, chúng sẽ hiển thị tại đây.
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chuyến đi</Text>
        <Text style={styles.headerSubtitle}>Quản lý booking và lịch khởi hành thuộc tour của bạn</Text>
      </View>
      {renderContent()}
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onSurface,
  },
  headerSubtitle: {
    marginTop: Spacing[1],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[6],
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: Spacing[3],
  },
  card: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  titleBlock: {
    flex: 1,
  },
  bookingId: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.outline,
  },
  tourTitle: {
    marginTop: 3,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  badgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  detailsGrid: {
    marginTop: Spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  detailText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  amountText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
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
  retryText: {
    fontFamily: FontFamily.semiBold,
    color: Colors.onPrimary,
  },
});
