import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { bookingsApi, MyBooking } from '@services/api/bookings.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type StatusAction = 'confirm' | 'complete';

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

const formatMoney = (amount: number, currency: string): string => {
  if (currency.toUpperCase() === 'VND') return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status as BookingStatus] ?? {
    label: status,
    background: Colors.surfaceContainer,
    foreground: Colors.onSurfaceVariant,
  };

export const ProviderBookingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const loadBookings = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await bookingsApi.getProviderBookings();
      console.log('[ProviderBookings] response:', response);
      setBookings(response);
    } catch (error) {
      console.error('[ProviderBookings] failed to load bookings:', error);
      setErrorMessage('Không thể tải danh sách booking. Vui lòng thử lại.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const updateBookingStatus = async (bookingId: string, action: StatusAction) => {
    setUpdatingBookingId(bookingId);
    try {
      if (action === 'confirm') {
        await bookingsApi.confirmBooking(bookingId);
      } else {
        await bookingsApi.completeBooking(bookingId);
      }
      await loadBookings(false);
    } catch (error) {
      console.error(`[ProviderBookings] ${action} failed:`, error);
      Alert.alert(
        'Không thể cập nhật booking',
        action === 'confirm'
          ? 'Không thể xác nhận booking. Vui lòng thử lại.'
          : 'Không thể hoàn thành booking. Vui lòng thử lại.',
      );
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const renderBooking = ({ item }: { item: MyBooking }) => {
    const status = item.status.toUpperCase();
    const statusConfig = getStatusConfig(status);
    const isUpdating = updatingBookingId === item.id;
    const action: StatusAction | null =
      status === 'PENDING' ? 'confirm' : status === 'CONFIRMED' ? 'complete' : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.bookingId}>Booking #{item.id}</Text>
            <Text style={styles.tourTitle} numberOfLines={2}>
              {item.tourTitle}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.badgeText, { color: statusConfig.foreground }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.trekkerName || item.trekkerEmail ? (
          <View style={styles.trekkerBlock}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
            <View style={styles.trekkerTextBlock}>
              {item.trekkerName ? <Text style={styles.trekkerName}>{item.trekkerName}</Text> : null}
              {item.trekkerEmail ? (
                <Text style={styles.trekkerEmail}>{item.trekkerEmail}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDateTime(item.scheduleDateTime)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={17} color={Colors.primary} />
            <Text style={styles.detailText}>{item.numberOfPeople} người</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={17} color={Colors.primary} />
            <Text style={styles.amountText}>{formatMoney(item.totalAmount, item.currency)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerDetails}>
            {item.paymentStatus ? (
              <Text style={styles.paymentText}>Thanh toán: {item.paymentStatus.toUpperCase()}</Text>
            ) : null}
            <Text style={styles.createdText}>Tạo lúc: {formatDateTime(item.createdAt)}</Text>
          </View>

          {action ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                action === 'complete' && styles.completeButton,
                isUpdating && styles.actionButtonDisabled,
              ]}
              onPress={event => {
                event.stopPropagation();
                updateBookingStatus(item.id, action);
              }}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {action === 'confirm' ? 'Xác nhận' : 'Hoàn thành'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải booking...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadBookings()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={bookings}
        keyExtractor={(item, index) => item.id || `provider-booking-${index}`}
        renderItem={renderBooking}
        contentContainerStyle={[
          styles.listContent,
          bookings.length === 0 && styles.emptyListContent,
          { paddingBottom: insets.bottom + Spacing[6] },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Ionicons name="file-tray-outline" size={60} color={Colors.outlineVariant} />
            <Text style={styles.stateTitle}>Chưa có booking nào</Text>
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
        <Text style={styles.headerTitle}>Quản lý booking</Text>
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
  card: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  titleBlock: { flex: 1 },
  bookingId: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.outline },
  tourTitle: {
    marginTop: 3,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  trekkerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[4],
    padding: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '0D',
  },
  trekkerTextBlock: { flex: 1 },
  trekkerName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.onSurface },
  trekkerEmail: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  detailsGrid: { marginTop: Spacing[3] },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  detailText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  amountText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing[3],
    marginTop: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  footerDetails: { flex: 1 },
  paymentText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  createdText: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
  },
  actionButton: {
    minWidth: 96,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  completeButton: { backgroundColor: Colors.successGreen },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
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
