import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { bookingsApi, MyBooking } from '@services/api/bookings.api';
import { GeneratedRouteType, routesApi } from '@services/api/routes.api';
import { toursApi } from '@services/api/tours.api';
import {
  trackingApi,
  TrackingDirection,
  TrackingSessionResponse,
} from '@services/api/tracking.api';
import { offlineRouteCache } from '@services/offline/offlineRouteCache';
import { useAuthStore } from '@store/authStore';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { decodePolylineData } from '@utils/routeMap';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'BookingDetail'>;
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type DetailAction = 'cancel' | 'confirm' | 'complete';
type PersistedTrackingSession = {
  bookingId: number;
  trackingSessionId: number;
  routeId?: number;
  tourTitle?: string;
  direction?: TrackingDirection;
  status?: 'ACTIVE' | 'PAUSED';
  routeRunMode?: 'OUTBOUND_TRACKING' | 'RETURN_TRACKING';
};

const ACTIVE_TRACKING_KEY = '@chektrek/active-tracking-session';
const TRACKING_ELIGIBLE_BOOKING_STATUSES = new Set(['CONFIRMED']);
const TRACKING_ELIGIBLE_PAYMENT_STATUSES = new Set(['PAID', 'SUCCESS', 'COMPLETED']);

const normalizeRouteType = (value?: string): GeneratedRouteType => {
  const normalizedValue = String(value ?? 'ONE_WAY').toUpperCase();
  if (normalizedValue === 'ROUND_TRIP') return 'ROUND_TRIP';
  if (normalizedValue === 'LOOP') return 'LOOP';
  return 'ONE_WAY';
};

const normalizeStatusValue = (value?: string | null): string => String(value ?? '').trim().toUpperCase();

const doesBookingStatusAllowTracking = (status?: string | null): boolean =>
  TRACKING_ELIGIBLE_BOOKING_STATUSES.has(normalizeStatusValue(status));

const doesPaymentStatusAllowTracking = (status?: string | null): boolean => {
  const normalizedStatus = normalizeStatusValue(status);
  return normalizedStatus.length > 0 && TRACKING_ELIGIBLE_PAYMENT_STATUSES.has(normalizedStatus);
};

const normalizeTrackingDirection = (value?: string | null): TrackingDirection =>
  String(value ?? 'OUTBOUND').toUpperCase() === 'RETURN' ? 'RETURN' : 'OUTBOUND';

const normalizeTrackingSessionStatus = (
  value?: string | null,
): 'ACTIVE' | 'PAUSED' | 'COMPLETED' | null => {
  const normalizedValue = normalizeStatusValue(value);
  if (normalizedValue === 'ACTIVE' || normalizedValue === 'PAUSED' || normalizedValue === 'COMPLETED') {
    return normalizedValue;
  }
  return null;
};

const getTrackingSessionId = (
  session?:
    | Pick<TrackingSessionResponse, 'trackingSessionId' | 'id'>
    | Pick<PersistedTrackingSession, 'trackingSessionId'>
    | null,
): number | undefined => {
  const sessionWithId = session as Pick<TrackingSessionResponse, 'trackingSessionId' | 'id'> | null;
  const sessionId = 'id' in (session ?? {})
    ? Number(sessionWithId?.trackingSessionId ?? sessionWithId?.id)
    : Number(session?.trackingSessionId);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
};

const shouldContinueTrackingSession = (session?: TrackingSessionResponse | null): boolean => {
  const status = normalizeTrackingSessionStatus(session?.status);
  return (status === 'ACTIVE' || status === 'PAUSED') && Boolean(getTrackingSessionId(session));
};

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

const ACTION_LABELS: Record<DetailAction, string> = {
  cancel: 'Hủy booking',
  confirm: 'Xác nhận',
  complete: 'Hoàn thành',
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

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

export const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const role = useAuthStore(state => state.user?.role);
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStartingTracking, setIsStartingTracking] = useState(false);
  const [isDownloadingRoute, setIsDownloadingRoute] = useState(false);
  const [hasOfflineRoute, setHasOfflineRoute] = useState(false);
  const [previewRouteId, setPreviewRouteId] = useState<number | undefined>();
  const [activeTracking, setActiveTracking] = useState<PersistedTrackingSession | null>(null);
  const [latestTrackingSession, setLatestTrackingSession] = useState<TrackingSessionResponse | null>(null);
  const [trackingRouteType, setTrackingRouteType] = useState<GeneratedRouteType>('ONE_WAY');

  const loadBooking = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setErrorMessage(null);

      try {
        console.log('[BookingDetail] fetching bookingId =', route.params.bookingId);
        const response = await bookingsApi.getBookingById(route.params.bookingId);
        console.log('[BookingDetail] response:', response);
        setBooking(response);
      } catch (error) {
        console.error('[BookingDetail] failed to load booking:', error);
        setErrorMessage('Không thể tải thông tin booking. Vui lòng thử lại.');
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [route.params.bookingId],
  );

  useFocusEffect(
    useCallback(() => {
      loadBooking();
      const loadActiveTracking = async () => {
        try {
          const rawSession = await AsyncStorage.getItem(ACTIVE_TRACKING_KEY);
          const session = rawSession ? (JSON.parse(rawSession) as PersistedTrackingSession) : null;
          setActiveTracking(session?.bookingId === Number(route.params.bookingId) ? session : null);
        } catch {
          setActiveTracking(null);
        }
      };
      const loadLatestTrackingSession = async () => {
        const numericBookingId = Number(route.params.bookingId);
        if (!Number.isFinite(numericBookingId) || numericBookingId <= 0) {
          console.warn('[BookingDetail] Skipping latest tracking session request because bookingId is invalid', {
            bookingId: route.params.bookingId,
          });
          setLatestTrackingSession(null);
          setErrorMessage('Không thể tải trạng thái tracking vì bookingId không hợp lệ.');
          return;
        }

        try {
          const session = await trackingApi.getLatestTrackingSessionByBooking(numericBookingId);
          setLatestTrackingSession(session);
        } catch (error) {
          console.log('[BookingDetail] latest tracking session lookup failed:', error);
          setLatestTrackingSession(null);
        }
      };
      void Promise.all([loadActiveTracking(), loadLatestTrackingSession()]);
    }, [loadBooking, route.params.bookingId]),
  );

  const performAction = async (action: DetailAction) => {
    setIsUpdating(true);
    try {
      if (action === 'cancel') {
        await bookingsApi.cancelMyBooking(route.params.bookingId);
      } else if (action === 'confirm') {
        await bookingsApi.confirmBooking(route.params.bookingId);
      } else {
        await bookingsApi.completeBooking(route.params.bookingId);
      }
      await loadBooking(false);
    } catch (error) {
      console.error(`[BookingDetail] ${action} failed:`, error);
      Alert.alert('Không thể cập nhật booking', 'Vui lòng thử lại.');
    } finally {
      setIsUpdating(false);
    }
  };

  const requestAction = (action: DetailAction) => {
    if (action !== 'cancel') {
      performAction(action);
      return;
    }

    Alert.alert('Hủy booking', 'Bạn có chắc muốn hủy booking này không?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy booking', style: 'destructive', onPress: () => performAction('cancel') },
    ]);
  };

  const getRouteIdForBooking = useCallback(async (
    currentBooking: MyBooking,
  ): Promise<number | undefined> => {
    if (currentBooking.routeId) return currentBooking.routeId;
    if (!currentBooking.tourId) return undefined;

    try {
      const tour = await toursApi.getById(String(currentBooking.tourId));
      const routeId = Number((tour as unknown as { routeId?: number | string }).routeId);
      return Number.isFinite(routeId) ? routeId : undefined;
    } catch (error) {
      console.log('[BookingDetail] routeId lookup failed:', error);
      return undefined;
    }
  }, []);

  const getCachedRouteIdForBooking = useCallback(async (
    currentBooking: MyBooking,
  ): Promise<number | undefined> => {
    const bookingId = Number(currentBooking.id);
    if (!Number.isFinite(bookingId)) return undefined;

    const cachedRoutes = await offlineRouteCache.listRoutes();
    return cachedRoutes.find(cachedRoute => cachedRoute.bookingId === bookingId)?.routeId;
  }, []);

  const resolveRouteIdForBooking = useCallback(async (
    currentBooking: MyBooking,
  ): Promise<number | undefined> => {
    const routeId = await getRouteIdForBooking(currentBooking);
    return routeId ?? getCachedRouteIdForBooking(currentBooking);
  }, [getCachedRouteIdForBooking, getRouteIdForBooking]);

  const loadTrackingRouteType = useCallback(
    async (currentBooking: MyBooking) => {
      try {
        const routeId = await getRouteIdForBooking(currentBooking);
        if (!routeId) {
          setTrackingRouteType('ONE_WAY');
          return;
        }

        const routeResponse = await routesApi.getRouteById(routeId);
        setTrackingRouteType(normalizeRouteType(routeResponse.routeType));
      } catch (error) {
        console.log('[BookingDetail] routeType lookup failed:', error);
        setTrackingRouteType('ONE_WAY');
      }
    },
    [getRouteIdForBooking],
  );

  const loadOfflineRouteStatus = useCallback(
    async (currentBooking: MyBooking) => {
      const routeId = await resolveRouteIdForBooking(currentBooking);
      const bookingId = Number(currentBooking.id);
      if (!routeId || !Number.isFinite(bookingId)) {
        setHasOfflineRoute(false);
        return;
      }

      const cachedRoute = await offlineRouteCache.loadRoute(bookingId, routeId);
      setHasOfflineRoute(Boolean(cachedRoute));
    },
    [resolveRouteIdForBooking],
  );

  const loadPreviewRouteId = useCallback(
    async (currentBooking: MyBooking) => {
      setPreviewRouteId(await resolveRouteIdForBooking(currentBooking));
    },
    [resolveRouteIdForBooking],
  );

  const openTrackingMap = (session: PersistedTrackingSession) => {
    console.log('[BookingDetail] openTrackingMap', {
      bookingId: session.bookingId,
      tourId: booking?.tourId,
      routeId: session.routeId ?? previewRouteId,
      sessionId: session.trackingSessionId,
      bookingStatus: booking?.status,
      paymentStatus: booking?.paymentStatus,
    });
    navigation.navigate('TrackingMap', {
      bookingId: session.bookingId,
      trackingSessionId: session.trackingSessionId,
      routeId: session.routeId,
      tourTitle: session.tourTitle,
      direction: session.direction ?? 'OUTBOUND',
      routeRunMode:
        session.routeRunMode ??
        (session.direction === 'RETURN' ? 'RETURN_TRACKING' : 'OUTBOUND_TRACKING'),
      status: session.status ?? 'ACTIVE',
    });
  };

  const openRoutePreview = (currentBooking: MyBooking, routeId: number) => {
    const bookingId = Number(currentBooking.id);
    if (!Number.isFinite(bookingId)) {
      Alert.alert('Không thể xem lộ trình', 'Mã booking không hợp lệ.');
      return;
    }

    navigation.navigate('TrackingMap', {
      mode: 'PREVIEW',
      bookingId,
      routeId,
      tourTitle: currentBooking.tourTitle,
      routeRunMode: 'FULL_ROUTE_PREVIEW',
    });
  };

  const startTracking = async (
    currentBooking: MyBooking,
    direction: TrackingDirection = 'OUTBOUND',
  ) => {
    const numericBookingId = Number(currentBooking.id);
    if (!Number.isFinite(numericBookingId) || numericBookingId <= 0) {
      console.warn('[BookingDetail] Skipping latest tracking session request because bookingId is invalid', {
        bookingId: currentBooking.id,
      });
      Alert.alert('Không thể bắt đầu GPS', 'Mã booking không hợp lệ.');
      return;
    }

    setIsStartingTracking(true);
    try {
      const routeId = await getRouteIdForBooking(currentBooking);
      const latestSession = await trackingApi.getLatestTrackingSessionByBooking(numericBookingId);
      const latestSessionId = getTrackingSessionId(latestSession);
      const latestSessionStatus = normalizeTrackingSessionStatus(latestSession?.status);

      if (
        latestSessionId &&
        (latestSessionStatus === 'ACTIVE' || latestSessionStatus === 'PAUSED')
      ) {
        const existingSession: PersistedTrackingSession = {
          bookingId: numericBookingId,
          trackingSessionId: latestSessionId,
          routeId,
          tourTitle: currentBooking.tourTitle,
          direction: normalizeTrackingDirection(latestSession?.direction ?? direction),
          routeRunMode:
            normalizeTrackingDirection(latestSession?.direction ?? direction) === 'RETURN'
              ? 'RETURN_TRACKING'
              : 'OUTBOUND_TRACKING',
          status: latestSessionStatus,
        };
        await AsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(existingSession));
        setLatestTrackingSession(latestSession);
        setActiveTracking(existingSession);
        openTrackingMap(existingSession);
        return;
      }

      console.log('[BookingDetail] startTracking request', {
        bookingId: numericBookingId,
        tourId: currentBooking.tourId,
        routeId,
        sessionId: latestSessionId ?? activeTracking?.trackingSessionId,
        bookingStatus: currentBooking.status,
        paymentStatus: currentBooking.paymentStatus,
        direction,
      });
      const response = await trackingApi.startTracking(numericBookingId, direction);
      const session: PersistedTrackingSession = {
        bookingId: numericBookingId,
        trackingSessionId: response.trackingSessionId,
        routeId,
        tourTitle: currentBooking.tourTitle,
        direction,
        routeRunMode: direction === 'RETURN' ? 'RETURN_TRACKING' : 'OUTBOUND_TRACKING',
        status: 'ACTIVE',
      };
      await AsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(session));
      setLatestTrackingSession({
        trackingSessionId: response.trackingSessionId,
        bookingId: numericBookingId,
        direction,
        status: 'ACTIVE',
      });
      setActiveTracking(session);
      openTrackingMap(session);
    } catch (error) {
      console.log('[BookingDetail] start tracking failed:', error);
      const maybeAxios = error as { response?: { status?: number; data?: { message?: string } } };
      const backendMessage = maybeAxios.response?.data?.message;
      const fallbackMessage =
        maybeAxios.response?.status === 409
          ? 'Đã có phiên theo dõi đang hoạt động.'
          : maybeAxios.response?.status === 400 || maybeAxios.response?.status === 403
            ? 'Booking này không đủ điều kiện theo dõi GPS.'
            : 'Vui lòng kiểm tra kết nối và thử lại.';
      Alert.alert('Không thể bắt đầu theo dõi GPS', backendMessage ?? fallbackMessage);
    } finally {
      setIsStartingTracking(false);
    }
  };

  const downloadOfflineRoute = async (currentBooking: MyBooking) => {
    const numericBookingId = Number(currentBooking.id);
    if (!Number.isFinite(numericBookingId)) {
      Alert.alert('Không thể tải lộ trình', 'Mã booking không hợp lệ.');
      return;
    }

    setIsDownloadingRoute(true);
    try {
      const routeId = await getRouteIdForBooking(currentBooking);
      if (!routeId) {
        Alert.alert('Không có lộ trình', 'Booking này chưa có lộ trình để tải offline.');
        return;
      }

      const [routeResponse, waypointResponse] = await Promise.all([
        routesApi.getRouteById(routeId),
        routesApi.getWaypoints(routeId),
      ]);

      await offlineRouteCache.saveRoute({
        bookingId: numericBookingId,
        tourId: currentBooking.tourId ? Number(currentBooking.tourId) : undefined,
        routeId,
        tourTitle: currentBooking.tourTitle,
        routeName: routeResponse.routeName,
        polylineData: routeResponse.polylineData,
        decodedCoordinates: decodePolylineData(routeResponse.polylineData),
        waypoints: waypointResponse,
        routeType: routeResponse.routeType,
        downloadedAt: new Date().toISOString(),
      });
      setHasOfflineRoute(true);
      Alert.alert('Đã tải lộ trình offline', 'Bạn có thể xem lộ trình khi không có internet.');
    } catch (error) {
      console.log('[BookingDetail] download offline route failed:', error);
      Alert.alert('Không thể tải lộ trình offline', 'Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setIsDownloadingRoute(false);
    }
  };

  useEffect(() => {
    if (!booking) return;
    void loadPreviewRouteId(booking);
    void loadTrackingRouteType(booking);
    void loadOfflineRouteStatus(booking);
  }, [booking, loadOfflineRouteStatus, loadPreviewRouteId, loadTrackingRouteType]);

  useEffect(() => {
    if (!booking) return;

    console.log('[BookingDetail] tracking debug', {
      bookingId: booking.id,
      tourId: booking.tourId,
      routeId: previewRouteId ?? booking.routeId ?? activeTracking?.routeId,
      sessionId: activeTracking?.trackingSessionId,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
    });
  }, [activeTracking?.routeId, activeTracking?.trackingSessionId, booking, previewRouteId]);

  const getAvailableAction = (status: string): DetailAction | null => {
    if (role === 'TREKKER' && (status === 'PENDING' || status === 'CONFIRMED')) return 'cancel';
    if (role === 'TOUR_PROVIDER' && status === 'PENDING') return 'confirm';
    if (role === 'TOUR_PROVIDER' && status === 'CONFIRMED') return 'complete';
    return null;
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

    if (errorMessage || !booking) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={styles.stateTitle}>Không thể tải booking</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadBooking()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const status = normalizeStatusValue(booking.status);
    const paymentStatus = normalizeStatusValue(booking.paymentStatus);
    const statusConfig = getStatusConfig(status);
    const action = getAvailableAction(status);
    const numericBookingId = Number(booking.id);
    const latestTrackingSessionId = getTrackingSessionId(latestTrackingSession);
    const latestTrackingStatus = normalizeTrackingSessionStatus(latestTrackingSession?.status);
    const resumableTrackingSession =
      latestTrackingSessionId && (latestTrackingStatus === 'ACTIVE' || latestTrackingStatus === 'PAUSED')
        ? {
            bookingId: numericBookingId,
            trackingSessionId: latestTrackingSessionId,
            routeId: previewRouteId ?? booking.routeId ?? activeTracking?.routeId,
            tourTitle: booking.tourTitle,
            direction: normalizeTrackingDirection(latestTrackingSession?.direction),
            routeRunMode:
              normalizeTrackingDirection(latestTrackingSession?.direction) === 'RETURN'
                ? ('RETURN_TRACKING' as const)
                : ('OUTBOUND_TRACKING' as const),
            status: latestTrackingStatus,
          }
        : null;
    const resolvedRouteId =
      previewRouteId ?? booking.routeId ?? resumableTrackingSession?.routeId ?? activeTracking?.routeId;
    const hasValidBookingId = Number.isFinite(numericBookingId);
    const isTrekker = role === 'TREKKER';
    const bookingAllowsTracking = doesBookingStatusAllowTracking(status);
    const paymentAllowsTracking = doesPaymentStatusAllowTracking(paymentStatus);
    const routeExists = Number.isFinite(Number(resolvedRouteId));
    const hasResumableTracking = Boolean(resumableTrackingSession?.trackingSessionId);
    const canReview =
      isTrekker &&
      status === 'COMPLETED' &&
      hasValidBookingId &&
      booking.tourId !== undefined;
    const canStartTracking =
      isTrekker &&
      hasValidBookingId &&
      bookingAllowsTracking &&
      paymentAllowsTracking &&
      routeExists;
    const canTrack = hasResumableTracking || canStartTracking;

    let trackingEligibilityMessage: string | null = null;
    if (isTrekker && !canTrack) {
      if (!hasValidBookingId) {
        trackingEligibilityMessage = 'Booking khong hop le nen chua the bat dau tracking.';
      } else if (!routeExists) {
        trackingEligibilityMessage = 'Booking nay chua co route hop le de bat dau tracking.';
      } else if (!paymentAllowsTracking) {
        trackingEligibilityMessage =
          paymentStatus.length > 0
            ? `Thanh toan hien tai la ${paymentStatus}, chua du dieu kien tracking.`
            : 'Booking chua co trang thai thanh toan hop le de bat dau tracking.';
      } else if (!bookingAllowsTracking) {
        trackingEligibilityMessage = `Booking status hien tai la ${status}, chua du dieu kien tracking.`;
      }
    }

    return (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.bookingId}>Booking #{booking.id}</Text>
          <Text style={styles.tourTitle}>{booking.tourTitle}</Text>
          <View style={[styles.badge, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.badgeText, { color: statusConfig.foreground }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin booking</Text>
          {booking.trekkerName ? (
            <DetailRow icon="person-outline" label="Trekker" value={booking.trekkerName} />
          ) : null}
          {booking.trekkerEmail ? (
            <DetailRow icon="mail-outline" label="Email trekker" value={booking.trekkerEmail} />
          ) : null}
          {booking.providerName ? (
            <DetailRow icon="briefcase-outline" label="Nhà cung cấp" value={booking.providerName} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label="Bắt đầu"
            value={formatDateTime(booking.scheduleDateTime)}
          />
          {booking.scheduleEndDateTime ? (
            <DetailRow
              icon="calendar-number-outline"
              label="Kết thúc"
              value={formatDateTime(booking.scheduleEndDateTime)}
            />
          ) : null}
          <DetailRow
            icon="people-outline"
            label="Số người"
            value={`${booking.numberOfPeople} người`}
          />
          <DetailRow
            icon="cash-outline"
            label="Tổng tiền"
            value={formatMoney(booking.totalAmount, booking.currency)}
          />
          <DetailRow
            icon="card-outline"
            label="Thanh toán"
            value={booking.paymentStatus?.toUpperCase() ?? '--'}
          />
          <DetailRow
            icon="time-outline"
            label="Ngày tạo"
            value={formatDateTime(booking.createdAt)}
          />
          {booking.meetingPoint ? (
            <DetailRow icon="location-outline" label="Điểm gặp" value={booking.meetingPoint} />
          ) : null}
        </View>

        {booking.note ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ghi chú</Text>
            <Text style={styles.noteText}>{booking.note}</Text>
          </View>
        ) : null}

        {action ? (
          <TouchableOpacity
            style={[styles.actionButton, action === 'cancel' && styles.cancelButton]}
            onPress={() => requestAction(action)}
            disabled={isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Text style={styles.actionText}>{ACTION_LABELS[action]}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {trackingEligibilityMessage ? (
          <View style={styles.eligibilityCard}>
            <Ionicons name="information-circle-outline" size={22} color={Colors.warningAmber} />
            <Text style={styles.eligibilityText}>{trackingEligibilityMessage}</Text>
          </View>
        ) : null}

        {canTrack && previewRouteId ? (
          <TouchableOpacity
            style={styles.viewRouteButton}
            onPress={() => openRoutePreview(booking, previewRouteId)}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={20} color={Colors.primary} />
            <Text style={styles.viewRouteText}>Xem lộ trình</Text>
          </TouchableOpacity>
        ) : null}

        {canStartTracking && trackingRouteType === 'ROUND_TRIP' && !hasResumableTracking ? (
          <View style={styles.trackingDirectionGroup}>
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => startTracking(booking, 'OUTBOUND')}
              disabled={isStartingTracking}
              activeOpacity={0.85}
            >
              {isStartingTracking ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.actionText}>Bắt đầu tracking lượt đi</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.returnTrackingButton}
              onPress={() => startTracking(booking, 'RETURN')}
              disabled={isStartingTracking}
              activeOpacity={0.85}
            >
              {isStartingTracking ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="return-down-back" size={20} color={Colors.onPrimary} />
                  <Text style={styles.actionText}>Bắt đầu tracking lượt về</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {canTrack ? (
          <TouchableOpacity
            style={styles.downloadRouteButton}
            onPress={() => downloadOfflineRoute(booking)}
            disabled={isDownloadingRoute}
            activeOpacity={0.85}
          >
            {isDownloadingRoute ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={hasOfflineRoute ? 'cloud-done-outline' : 'download-outline'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.downloadRouteText}>
                  {hasOfflineRoute ? 'Đã tải lộ trình offline' : 'Download Route'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canTrack && (trackingRouteType !== 'ROUND_TRIP' || hasResumableTracking) ? (
          <TouchableOpacity
            style={styles.trackingButton}
            onPress={() =>
              resumableTrackingSession
                ? openTrackingMap(resumableTrackingSession)
                : startTracking(booking, 'OUTBOUND')
            }
            disabled={isStartingTracking}
            activeOpacity={0.85}
          >
            {isStartingTracking ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
                <>
                  <Ionicons name="navigate-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.actionText}>
                    {hasResumableTracking ? 'Tiếp tục tracking' : 'Bắt đầu tracking'}
                  </Text>
                </>
              )}
          </TouchableOpacity>
        ) : null}

        {canReview ? (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() =>
              navigation.navigate('ReviewForm', {
                bookingId: numericBookingId,
                tourId: booking.tourId as number,
                tourTitle: booking.tourTitle,
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="star-outline" size={20} color={Colors.onPrimary} />
            <Text style={styles.actionText}>Đánh giá tour</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết booking</Text>
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
  content: { padding: Spacing[4], gap: Spacing[4] },
  summaryCard: {
    alignItems: 'flex-start',
    padding: Spacing[5],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  bookingId: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.outline },
  tourTitle: {
    marginTop: Spacing[2],
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onSurface,
  },
  badge: {
    marginTop: Spacing[3],
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  card: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  sectionTitle: {
    marginBottom: Spacing[2],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  detailIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '12',
  },
  detailContent: { flex: 1, marginLeft: Spacing[3] },
  detailLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.outline },
  detailValue: {
    marginTop: 3,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  noteText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 23,
    color: Colors.onSurfaceVariant,
  },
  eligibilityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningAmber + '14',
    borderWidth: 1,
    borderColor: Colors.warningAmber + '45',
  },
  eligibilityText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: Colors.onSurface,
  },
  actionButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  cancelButton: { backgroundColor: Colors.error },
  reviewButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.warningAmber,
  },
  trackingDirectionGroup: {
    gap: Spacing[3],
  },
  trackingButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.successGreen,
  },
  returnTrackingButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  viewRouteButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.primary + '45',
  },
  viewRouteText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  downloadRouteButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '35',
  },
  downloadRouteText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  actionText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
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
