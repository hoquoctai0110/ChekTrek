import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
  Circle,
  Path,
} from 'react-native-svg';

import { RootStackParamList } from '@navigation/types';
import { paymentsApi } from '@services/api/payments.api';
import { BookingPaymentBookingStatus, PaymentStatusResponse } from '../../../types';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'PaymentPendingConfirmation'>;

const SYNC_POLLING_INTERVAL_MS = 2000;
const SYNC_TIMEOUT_MS = 60000;

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} d`;

const isPaidStatus = (status: string | undefined | null) => String(status ?? '').toUpperCase() === 'PAID';
const isConfirmedStatus = (status: string | undefined | null) =>
  String(status ?? '').toUpperCase() === 'CONFIRMED';

const normalizeBookingStatus = (
  status: string | undefined | null,
): BookingPaymentBookingStatus => {
  const normalized = String(status ?? 'PENDING_PAYMENT').toUpperCase();

  if (
    normalized === 'PENDING_PAYMENT' ||
    normalized === 'CONFIRMED' ||
    normalized === 'CANCELLED' ||
    normalized === 'COMPLETED'
  ) {
    return normalized;
  }

  return 'PENDING_PAYMENT';
};

const isConfirmedPaymentResult = (result: PaymentStatusResponse) => {
  return (
    isPaidStatus(result.localPaymentStatus) ||
    isConfirmedStatus(result.localBookingStatus) ||
    isPaidStatus(result.remoteStatus) ||
    isPaidStatus(result.paymentStatus) ||
    isConfirmedStatus(result.bookingStatus) ||
    isPaidStatus(result.status)
  );
};

export const PaymentPendingConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const orderCode = params.orderCode;
  const parsedOrderCode = Number(orderCode);
  const displayTitle = params.tourTitle ?? params.tourName ?? 'Booking';
  const displayAmount = params.amount ?? 0;

  const [statusMessage, setStatusMessage] = useState(
    params.confirmationMessage ?? 'Đang xác nhận thanh toán...',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestInFlightRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const navigateToSuccess = useCallback(
    (result: PaymentStatusResponse) => {
      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      console.log('[PaymentPending] navigate success', {
        bookingId: result.bookingId ?? params.bookingId,
        orderCode: result.orderCode ?? params.orderCode,
      });

      navigation.replace('PaymentSuccess', {
        bookingId: result.bookingId ?? params.bookingId ?? '',
        orderCode: result.orderCode ?? params.orderCode,
        paymentId: result.paymentId,
        amount: result.amount ?? params.amount,
        paymentStatus: 'PAID',
        bookingStatus: normalizeBookingStatus(result.bookingStatus ?? params.bookingStatus),
        tourName: params.tourName,
        tourTitle: result.tourTitle ?? params.tourTitle ?? params.tourName,
        scheduleDate: params.scheduleDate,
        numberOfPeople: params.numberOfPeople,
        paidAt: result.paidAt,
      });
    },
    [
      navigation,
      params.amount,
      params.bookingId,
      params.bookingStatus,
      params.numberOfPeople,
      params.orderCode,
      params.scheduleDate,
      params.tourName,
      params.tourTitle,
    ],
  );

  const syncOnce = useCallback(async () => {
    console.log('[PaymentPending] orderCode', orderCode);

    if (!Number.isFinite(parsedOrderCode)) {
      setErrorMessage('Khong tim thay orderCode hop le de xac nhan thanh toan.');
      setStatusMessage('Thanh toán đang được xử lý, vui lòng kiểm tra lại sau');
      setIsLoading(false);
      setHasTimedOut(true);
      return null;
    }

    if (requestInFlightRef.current) {
      return null;
    }

    requestInFlightRef.current = true;
    console.log('[PaymentPending] sync request', { orderCode: parsedOrderCode });

    try {
      const result = await paymentsApi.syncPaymentStatusByOrderCode(parsedOrderCode);

      console.log('[PaymentPending] raw response', result);
      console.log('[PaymentPending] parsed statuses', {
        localPaymentStatus: result.localPaymentStatus,
        localBookingStatus: result.localBookingStatus,
        remoteStatus: result.remoteStatus,
        paymentStatus: result.paymentStatus,
        bookingStatus: result.bookingStatus,
        status: result.status,
      });

      if (!isMountedRef.current || hasNavigatedRef.current) {
        return result;
      }

      setErrorMessage(null);

      if (isConfirmedPaymentResult(result)) {
        setStatusMessage('Thanh toán đã được xác nhận.');
        setIsLoading(false);
        setHasTimedOut(false);
        navigateToSuccess(result);
        return result;
      }

      setStatusMessage('Đang xác nhận thanh toán...');
      return result;
    } catch (error) {
      if (!isMountedRef.current) {
        return null;
      }

      console.log('[PaymentPending] raw response', error);
      setErrorMessage('Khong the dong bo thanh toan luc nay. Vui long thu kiem tra lai.');
      return null;
    } finally {
      requestInFlightRef.current = false;
    }
  }, [navigateToSuccess, orderCode, parsedOrderCode]);

  const startPolling = useCallback(() => {
    clearTimer();
    startedAtRef.current = Date.now();
    setIsLoading(true);
    setHasTimedOut(false);
    setErrorMessage(null);
    setStatusMessage('Đang xác nhận thanh toán...');

    const poll = async () => {
      const result = await syncOnce();

      if (!isMountedRef.current || hasNavigatedRef.current) {
        return;
      }

      if (result && isConfirmedPaymentResult(result)) {
        return;
      }

      const startedAt = startedAtRef.current ?? Date.now();
      const timedOut = Date.now() - startedAt >= SYNC_TIMEOUT_MS;

      if (timedOut) {
        console.log('[PaymentPending] timeout', { orderCode: parsedOrderCode });
        setIsLoading(false);
        setHasTimedOut(true);
        setStatusMessage('Thanh toán đang được xử lý, vui lòng kiểm tra lại sau');
        return;
      }

      timerRef.current = setTimeout(() => {
        void poll();
      }, SYNC_POLLING_INTERVAL_MS);
    };

    void poll();
  }, [clearTimer, parsedOrderCode, syncOnce]);

  useEffect(() => {
    isMountedRef.current = true;
    startPolling();

    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer, startPolling]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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

      <View
        style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.title}>Đang xác nhận thanh toán...</Text>
        <Text style={styles.subtitle}>{statusMessage}</Text>

        <View style={styles.iconWrapper}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0A7A4A" />
          ) : (
            <Svg width={188} height={188} viewBox="0 0 188 188">
              <Circle cx="94" cy="94" r="82" stroke="#0A7A4A" strokeWidth="10" fill="none" />
              <Path
                d="M94 52 V94 L122 110"
                stroke="#0A7A4A"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Tour</Text>
          <Text style={styles.infoValue}>{displayTitle}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>So tien</Text>
          <Text style={styles.infoAmount}>{formatCurrency(displayAmount)}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Booking ID</Text>
          <Text style={styles.infoValue}>{String(params.bookingId ?? '--')}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Order code</Text>
          <Text style={styles.infoValue}>{String(params.orderCode ?? '--')}</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {hasTimedOut ? (
          <Text style={styles.pendingText}>Thanh toán đang được xử lý, vui lòng kiểm tra lại sau</Text>
        ) : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={() => void syncOnce()} activeOpacity={0.85}>
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Defs>
                <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#00F582" />
                  <Stop offset="100%" stopColor="#E3F53C" />
                </SvgLinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#btnGrad)" rx={28} ry={28} />
            </Svg>
          </View>
          <Text style={styles.primaryBtnText}>Kiểm tra lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[5],
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: '#0A2518',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: '#0A2518',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing[1],
    minHeight: 188,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 20,
    padding: Spacing[5],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  infoAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A7A4A',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(10,37,24,0.08)',
    marginVertical: Spacing[1],
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#B42318',
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#0A2518',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    zIndex: 1,
  },
  secondaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.18)',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  secondaryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
});
