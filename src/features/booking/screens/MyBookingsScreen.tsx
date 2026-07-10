import React, { useCallback, useState } from 'react';
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
import { bookingsApi, MyBooking } from '@services/api/bookings.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type KnownBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

const STATUS_COLORS: Record<KnownBookingStatus, { background: string; foreground: string }> = {
  PENDING: { background: Colors.warningAmber + '20', foreground: Colors.warningAmber },
  CONFIRMED: { background: Colors.successGreen + '20', foreground: Colors.successGreen },
  CANCELLED: { background: Colors.errorContainer, foreground: Colors.error },
  COMPLETED: { background: Colors.primary + '18', foreground: Colors.primary },
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

const getStatusColors = (status: string) =>
  STATUS_COLORS[status as KnownBookingStatus] ?? {
    background: Colors.surfaceContainer,
    foreground: Colors.onSurfaceVariant,
  };

export const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await bookingsApi.getMyBookings();
      console.log('[MyBookings] response:', response);
      setBookings(response);
    } catch (error) {
      console.error('[MyBookings] failed to load bookings:', error);
      setErrorMessage('Không thể tải danh sách tour đã đặt. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const handleBookingPress = (bookingId: string) => {
    navigation.navigate('BookingDetail', { bookingId });
  };

  const renderBooking = ({ item }: { item: MyBooking }) => {
    const statusColors = getStatusColors(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleBookingPress(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.tourTitle} numberOfLines={2}>
            {item.tourTitle}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColors.background }]}>
            <Text style={[styles.badgeText, { color: statusColors.foreground }]}>
              {item.status}
            </Text>
          </View>
        </View>

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

        <View style={styles.cardFooter}>
          <View>
            {item.paymentStatus ? (
              <Text style={styles.paymentText}>Thanh toán: {item.paymentStatus.toUpperCase()}</Text>
            ) : null}
            <Text style={styles.createdText}>Đặt lúc: {formatDateTime(item.createdAt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={Colors.outline} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải tour đã đặt...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={bookings}
        keyExtractor={(item, index) => item.id || `booking-${index}`}
        renderItem={renderBooking}
        contentContainerStyle={[
          styles.listContent,
          bookings.length === 0 && styles.emptyListContent,
          { paddingBottom: insets.bottom + Spacing[6] },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Ionicons name="calendar-outline" size={60} color={Colors.outlineVariant} />
            <Text style={styles.stateTitle}>Bạn chưa đặt tour nào</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Main', { screen: 'BookTour' })}
            >
              <Text style={styles.browseText}>Khám phá tour</Text>
            </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Tour đã đặt</Text>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  tourTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  paymentText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  createdText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    marginTop: 3,
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
  browseButton: {
    marginTop: Spacing[5],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  browseText: { fontFamily: FontFamily.semiBold, color: Colors.onPrimary },
});
