import React, { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '@components/common/SafeScreen';
import { PrimaryButton } from '@components/buttons/PrimaryButton';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { RootStackParamList } from '@navigation/types';
import { DIFFICULTY_CONFIG, PLACEHOLDER_IMAGES } from '@constants/index';
import { toursApi } from '@services/api/tours.api';
import { bookingsApi } from '@services/api/bookings.api';
import { tourSchedulesApi, type TourSchedule } from '@services/api/tourSchedules.api';
import { CreateBookingResponse } from '../../../types';

type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;
type BookingNavProp = NativeStackNavigationProp<RootStackParamList>;
type DifficultyKey = keyof typeof DIFFICULTY_CONFIG;

type BackendCheckoutTour = {
  id?: string | number;
  tourId?: string | number;
  title?: string;
  name?: string;
  tourName?: string;
  destination?: string;
  destinationName?: string;
  meetingPoint?: string;
  location?: string;
  province?: string;
  difficulty?: string;
  price?: number | string | null;
  pricePerPerson?: number | string | null;
  maxParticipants?: number | string | null;
  thumbnailUrl?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  imageUrls?: string[] | string;
  providerName?: string;
  guideName?: string;
  provider?: {
    name?: string;
    avatarUrl?: string;
  };
  guide?: {
    name?: string;
    avatarUrl?: string;
  };
};

type CheckoutTour = {
  id: string;
  title: string;
  destination: string;
  difficulty: DifficultyKey;
  price: number;
  maxParticipants: number;
  thumbnailUrl: string;
  schedules: TourSchedule[];
  providerName: string;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const normalizeDifficulty = (value: unknown): DifficultyKey => {
  const difficulty = String(value ?? 'Moderate').toLowerCase();
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'Hard';
  if (difficulty === 'extreme') return 'Extreme';
  return 'Moderate';
};

const formatScheduleDate = (schedule: TourSchedule): string => {
  const formatDate = (value: string): string => {
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

  const startLabel = formatDate(schedule.startDateTime);
  if (!schedule.endDateTime) return startLabel;

  return `${startLabel} - ${formatDate(schedule.endDateTime)}`;
};

const mapBackendCheckoutTour = (tour: BackendCheckoutTour, fallbackId: string): CheckoutTour => {
  const imageUrls = [
    ...toStringArray(tour.imageUrls),
    ...toStringArray(tour.thumbnailUrl),
    ...toStringArray(tour.imageUrl),
    ...toStringArray(tour.coverImageUrl),
  ];

  return {
    id: String(tour.id ?? tour.tourId ?? fallbackId),
    title: tour.title ?? tour.name ?? tour.tourName ?? 'Tour chưa có tên',
    destination:
      tour.destination ??
      tour.destinationName ??
      tour.meetingPoint ??
      tour.location ??
      tour.province ??
      'Chưa cập nhật địa điểm',
    difficulty: normalizeDifficulty(tour.difficulty),
    price: toNumber(tour.price ?? tour.pricePerPerson),
    maxParticipants: Math.max(1, toNumber(tour.maxParticipants, 1)),
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    schedules: [],
    providerName:
      tour.providerName ??
      tour.guideName ??
      tour.provider?.name ??
      tour.guide?.name ??
      'Chưa cập nhật nhà cung cấp',
  };
};

export const BookingScreen: React.FC = () => {
  const route = useRoute<BookingRouteProp>();
  const navigation = useNavigation<BookingNavProp>();
  const insets = useSafeAreaInsets();
  const [participants, setParticipants] = useState(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tour, setTour] = useState<CheckoutTour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const fetchTour = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [response, schedules] = await Promise.all([
        toursApi.getById(route.params.tourId),
        tourSchedulesApi.getAvailable(route.params.tourId),
      ]);
      const mappedTour = mapBackendCheckoutTour(
        response as unknown as BackendCheckoutTour,
        route.params.tourId,
      );
      setTour({ ...mappedTour, schedules });
      setParticipants(current => Math.min(Math.max(1, current), mappedTour.maxParticipants));
      setSelectedScheduleId(null);
    } catch (error) {
      console.log('[Booking] failed to fetch tour', error);
      setTour(null);
      setErrorMessage('Không thể tải thông tin tour. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [route.params.tourId]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Đặt Tour</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeScreen>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải thông tin tour...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (errorMessage || !tour) {
    return (
      <SafeScreen>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Không thể tải tour</Text>
          <Text style={styles.stateText}>
            {errorMessage ?? 'Tour này hiện chưa có thông tin để hiển thị.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTour} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const selectedSchedule = tour.schedules.find(schedule => schedule.id === selectedScheduleId);
  const basePrice = selectedSchedule?.price ?? tour.price;
  const difficulty = DIFFICULTY_CONFIG[tour.difficulty];
  const subtotal = basePrice * participants;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;
  const maxSelectableParticipants =
    selectedSchedule?.availableSlots !== undefined
      ? Math.max(1, Math.min(tour.maxParticipants, selectedSchedule.availableSlots))
      : tour.maxParticipants;
  const canContinue = Boolean(selectedScheduleId);

  const handleBook = async () => {
    if (!selectedScheduleId) {
      Alert.alert('Lỗi', 'Vui lòng chọn lịch khởi hành.');
      return;
    }

    const tourId = Number(tour.id);
    const scheduleId = Number(selectedScheduleId);
    if (!Number.isFinite(tourId) || !Number.isFinite(scheduleId)) {
      Alert.alert('Lỗi', 'Thông tin tour hoặc lịch khởi hành không hợp lệ.');
      return;
    }

    setIsBooking(true);
    try {
      const payload = {
        tourId,
        scheduleId,
        numberOfPeople: participants,
        note: notes.trim() || '',
      };

      const booking = await bookingsApi.create(payload);
      const bookingResult: CreateBookingResponse = booking;

      if (!bookingResult.checkoutUrl) {
        Alert.alert('Lỗi', 'Không nhận được liên kết thanh toán từ hệ thống. Vui lòng thử lại.');
        return;
      }

      if (!Number.isFinite(bookingResult.orderCode)) {
        Alert.alert('Lỗi', 'Không nhận được mã thanh toán hợp lệ. Vui lòng thử lại.');
        return;
      }

      navigation.navigate('PaymentMethod', {
        bookingId: bookingResult.bookingId,
        orderCode: bookingResult.orderCode,
        checkoutUrl: bookingResult.checkoutUrl,
        amount: bookingResult.amount ?? total,
        paymentStatus: bookingResult.paymentStatus,
        bookingStatus: bookingResult.bookingStatus,
        tourName: bookingResult.tourName ?? tour.title,
        scheduleDate: selectedSchedule ? formatScheduleDate(selectedSchedule) : undefined,
        numberOfPeople: participants,
      });
    } catch (error) {
      console.log('[Booking] failed to create booking', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      const isTimeout = axiosError.code === 'ECONNABORTED';
      const hasNoResponse = !axiosError.response;

      let message = 'Không thể tạo đặt tour. Vui lòng thử lại.';
      if (isTimeout) {
        message = 'Yêu cầu đặt tour bị quá thời gian. Vui lòng kiểm tra mạng và thử lại.';
      } else if (hasNoResponse) {
        message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra internet và thử lại.';
      } else if (axiosError.response?.status && axiosError.response.status >= 500) {
        message = 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.';
      } else if (axiosError.response?.data?.message) {
        message = axiosError.response.data.message;
      }

      Alert.alert('Lỗi', message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Hủy đặt tour', 'Bạn có chắc muốn hủy đặt tour này không?', [
      { text: 'Tiếp tục đặt', style: 'cancel' },
      {
        text: 'Hủy',
        style: 'destructive',
        onPress: () => navigation.navigate('Main', { screen: 'Home' }),
      },
    ]);
  };

  return (
    <SafeScreen backgroundColor="transparent">
      {/* ── Gradient Background ── */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="bgGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E5F9CE" />
              <Stop offset="100%" stopColor="#A2EDB4" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* Header */}
      {renderHeader()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tour Preview */}
        <View style={styles.tourPreview}>
          <Image source={{ uri: tour.thumbnailUrl }} style={styles.tourImage} resizeMode="cover" />
          <View style={styles.tourInfo}>
            <Text style={styles.tourTitle} numberOfLines={2}>
              {tour.title}
            </Text>
            <View style={styles.tourMeta}>
              <Ionicons name="location-outline" size={13} color={Colors.onSurfaceVariant} />
              <Text style={styles.tourLocation}>{tour.destination}</Text>
            </View>
            <View style={[styles.diffBadge, { backgroundColor: difficulty.bgColor }]}>
              <Text style={[styles.diffText, { color: difficulty.color }]}>{difficulty.label}</Text>
            </View>
            <Text style={styles.providerName} numberOfLines={1}>
              {tour.providerName}
            </Text>
          </View>
        </View>

        {/* Participants Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Số Người Tham Gia</Text>
          <View style={styles.participantRow}>
            <TouchableOpacity
              style={styles.countBtn}
              onPress={() => setParticipants(p => Math.max(1, p - 1))}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={styles.countValue}>{participants}</Text>
              <Text style={styles.countLabel}>người</Text>
            </View>
            <TouchableOpacity
              style={styles.countBtn}
              onPress={() => setParticipants(p => Math.min(maxSelectableParticipants, p + 1))}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.maxNote}>Tối đa {maxSelectableParticipants} người</Text>
        </View>

        {/* Date Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chọn Lịch Khởi Hành</Text>
          {tour.schedules.length > 0 ? (
            <View style={styles.dateGrid}>
              {tour.schedules.map(schedule => (
                <TouchableOpacity
                  key={schedule.id}
                  style={[
                    styles.dateChip,
                    selectedScheduleId === schedule.id && styles.dateChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedScheduleId(schedule.id);
                    setParticipants(current =>
                      schedule.availableSlots === undefined
                        ? current
                        : Math.min(current, Math.max(1, schedule.availableSlots)),
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateText,
                      selectedScheduleId === schedule.id && styles.dateTextSelected,
                    ]}
                  >
                    {formatScheduleDate(schedule)}
                  </Text>
                  {schedule.availableSlots !== undefined && (
                    <Text
                      style={[
                        styles.slotsText,
                        selectedScheduleId === schedule.id && styles.dateTextSelected,
                      ]}
                    >
                      Còn {schedule.availableSlots} chỗ
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyDateText}>Chưa có lịch khởi hành</Text>
          )}
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ghi Chú (tuỳ chọn)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Yêu cầu đặc biệt, dị ứng, v.v..."
            placeholderTextColor={Colors.outline}
            style={styles.notesInput}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tóm Tắt Chi Phí</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {basePrice.toLocaleString('vi-VN')}đ × {participants} người
            </Text>
            <Text style={styles.priceValue}>{subtotal.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí dịch vụ (5%)</Text>
            <Text style={styles.priceValue}>{serviceFee.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View>
          <Text style={styles.footerTotal}>{total.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.footerLabel}>{participants} người</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtnGradient, (!canContinue || isBooking) && { opacity: 0.6 }]}
          onPress={handleBook}
          activeOpacity={0.85}
          disabled={!canContinue || isBooking}
        >
          {/* Gradient button */}
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Defs>
                <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#00F582" />
                  <Stop offset="100%" stopColor="#E3F53C" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                width="100%"
                height="100%"
                fill={(!canContinue || isBooking) ? '#CCCCCC' : 'url(#btnGrad)'}
                rx={24}
                ry={24}
              />
            </Svg>
          </View>
          <Text style={styles.bookBtnText}>{isBooking ? 'Đang xử lý...' : 'Tiếp theo →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
    backgroundColor: Colors.background,
  },
  stateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing[5],
    borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: 120,
    gap: Spacing[3],
  },
  tourPreview: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    ...(Shadows.sm as object),
  },
  tourImage: {
    width: 110,
    height: 110,
  },
  tourInfo: {
    flex: 1,
    padding: Spacing[3],
    gap: 6,
  },
  tourTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  diffText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  providerName: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    ...(Shadows.sm as object),
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[6],
  },
  countBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  countValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.onSurface,
  },
  countLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  maxNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    textAlign: 'center',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '40',
  },
  dateChipSelected: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primary,
  },
  dateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  dateTextSelected: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  slotsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  emptyDateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '50',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
  priceValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant + '40',
  },
  totalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  totalValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '20',
    ...(Shadows.navbar as object),
  },
  footerTotal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  footerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  bookBtnGradient: {
    height: 48,
    minWidth: 140,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#00F582',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  bookBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
    zIndex: 1,
  },
});
