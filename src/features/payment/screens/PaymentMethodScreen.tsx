import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { RootStackParamList } from '@navigation/types';
import { paymentsApi } from '@services/api/payments.api';
import { API_ENDPOINTS } from '@constants/index';
import {
  BookingPaymentBookingStatus,
  BookingPaymentStatus,
  PaymentStatusResponse,
} from '../../../types';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'PaymentMethod'>;
type CallbackKind = 'success' | 'cancel' | null;
type WebViewMessagePayload = {
  type?: string;
  href?: string;
  bodyText?: string;
  text?: string;
};

const POLLING_INTERVAL_MS = 3000;
const TERMINAL_PAYMENT_STATUSES: BookingPaymentStatus[] = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

const PAYMENT_STATUS_META: Record<BookingPaymentStatus, { message: string }> = {
  PENDING: {
    message: 'He thong dang cho xac nhan thanh toan tu backend.',
  },
  PAID: {
    message: 'Thanh toan da duoc xac nhan.',
  },
  FAILED: {
    message: 'Thanh toan khong thanh cong. Ban co the thu lai sau.',
  },
  CANCELLED: {
    message: 'Giao dich da bi huy. Ban co the quay lai de dat lai khi san sang.',
  },
  EXPIRED: {
    message: 'Lien ket thanh toan da het han. Hay quay lai de tao giao dich moi.',
  },
};

const SUCCESS_QUERY_HINTS = [
  '/payments/return',
  'code=00',
  'status=paid',
  'paymentstatus=paid',
  'payment_status=paid',
  'result=success',
  'success=true',
  'paymentresult=success',
  'payment_result=success',
  'payment-success',
  '/success',
  '/paid',
  'completed=true',
];

const CANCEL_QUERY_HINTS = [
  'status=cancel',
  'status=cancelled',
  'status=failed',
  'status=expired',
  'cancel=true',
  'result=cancel',
  'result=failed',
  '/cancel',
  '/failed',
  '/expired',
];

const PAYMENT_RETURN_PATH = API_ENDPOINTS.PAYMENTS_RETURN;
const PAYMENT_CANCEL_PATH = API_ENDPOINTS.PAYMENTS_CANCEL;
const WEBVIEW_STATUS_INJECTION = `
  (function () {
    var intervalId = null;
    function postSnapshot(type) {
      try {
        var text = document.body ? document.body.innerText || '' : '';
        var href = window.location.href;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          href: href,
          bodyText: text,
          text: text
        }));
      } catch (error) {}
    }

    function detectSuccessText() {
      try {
        var text = document.body ? document.body.innerText || '' : '';
        if (
          text.includes('Thanh toán thành công') ||
          text.includes('Về lại cửa hàng')
        ) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYOS_SUCCESS_PAGE',
            href: window.location.href,
            bodyText: text,
            text: text
          }));
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (error) {}
    }

    try {
      postSnapshot('page-snapshot');
      detectSuccessText();
      intervalId = setInterval(detectSuccessText, 500);
    } catch (error) {}
    true;
  })();
`;

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError.code === 'ECONNABORTED') {
    return 'Yeu cau kiem tra trang thai bi qua thoi gian. Vui long thu lai.';
  }

  if (!axiosError.response) {
    return 'Khong the ket noi den may chu. Vui long kiem tra internet va thu lai.';
  }

  if (axiosError.response.status >= 500) {
    return 'May chu dang ban. Vui long thu lai sau it phut.';
  }

  return axiosError.response.data?.message ?? 'Khong the kiem tra trang thai thanh toan.';
};

const isTerminalStatus = (status: BookingPaymentStatus) => TERMINAL_PAYMENT_STATUSES.includes(status);

const isSuccessfulPaymentStatus = (status: string | undefined | null) => {
  const normalized = String(status ?? '').toUpperCase();
  return normalized === 'PAID' || normalized === 'SUCCESS' || normalized === 'COMPLETED';
};

const isConfirmedBookingStatus = (status: string | undefined | null) => {
  return String(status ?? '').toUpperCase() === 'CONFIRMED';
};

const isValidBookingPaymentStatus = (status: string): status is BookingPaymentStatus => {
  return (
    status === 'PENDING' ||
    status === 'PAID' ||
    status === 'FAILED' ||
    status === 'CANCELLED' ||
    status === 'EXPIRED'
  );
};

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

const normalizePaymentStatus = (status: string | undefined | null): BookingPaymentStatus => {
  if (isSuccessfulPaymentStatus(status)) {
    return 'PAID';
  }

  const normalized = String(status ?? 'PENDING').toUpperCase();
  return isValidBookingPaymentStatus(normalized) ? normalized : 'PENDING';
};

const isConfirmedPaymentResult = (result: PaymentStatusResponse) => {
  return (
    isSuccessfulPaymentStatus(result.paymentStatus) ||
    isSuccessfulPaymentStatus(result.status) ||
    isSuccessfulPaymentStatus(result.localPaymentStatus) ||
    isSuccessfulPaymentStatus(result.remoteStatus) ||
    isConfirmedBookingStatus(result.bookingStatus) ||
    isConfirmedBookingStatus(result.localBookingStatus)
  );
};

const pageBodyLooksSuccessful = (bodyText?: string | null) => {
  const normalized = String(bodyText ?? '').toUpperCase();
  return normalized.includes('PAID') || normalized.includes('CONFIRMED');
};

const getCallbackKind = (rawUrl: string): CallbackKind => {
  const normalizedUrl = decodeURIComponent(rawUrl).toLowerCase();

  if (normalizedUrl.includes(PAYMENT_CANCEL_PATH)) {
    return 'cancel';
  }

  if (normalizedUrl.includes(PAYMENT_RETURN_PATH)) {
    return 'success';
  }

  if (CANCEL_QUERY_HINTS.some(hint => normalizedUrl.includes(hint))) {
    return 'cancel';
  }

  if (SUCCESS_QUERY_HINTS.some(hint => normalizedUrl.includes(hint))) {
    return 'success';
  }

  return null;
};

export const PaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const parsedOrderCode = Number(params.orderCode);
  const hasOrderCode = Number.isFinite(parsedOrderCode);
  const hasCheckoutUrl = Boolean(params.checkoutUrl);
  const hasRequiredParams = hasOrderCode && hasCheckoutUrl;

  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentStatus>(
    normalizePaymentStatus(params.paymentStatus),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const paymentStatusRef = useRef<BookingPaymentStatus>(normalizePaymentStatus(params.paymentStatus));
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRequestInFlightRef = useRef(false);
  const hasNavigatedToSuccessRef = useRef(false);
  const hasNavigatedToPendingRef = useRef(false);
  const webViewRef = useRef<WebView | null>(null);
  const callbackVerificationInFlightRef = useRef(false);

  const showWebView = hasRequiredParams && paymentStatus === 'PENDING';

  const clearPollingTimeout = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  const navigateToSuccessScreen = useCallback(
    (payload: PaymentStatusResponse) => {
      if (hasNavigatedToSuccessRef.current) {
        return;
      }

      hasNavigatedToSuccessRef.current = true;

      navigation.replace('PaymentSuccess', {
        bookingId: payload.bookingId ?? params.bookingId ?? '',
        orderCode: payload.orderCode ?? params.orderCode,
        paymentId: payload.paymentId,
        amount: payload.amount ?? params.amount,
        paymentStatus: 'PAID',
        bookingStatus: normalizeBookingStatus(payload.bookingStatus ?? params.bookingStatus),
        tourName: params.tourName,
        tourTitle: payload.tourTitle ?? params.tourName,
        scheduleDate: params.scheduleDate,
        numberOfPeople: params.numberOfPeople,
        paidAt: payload.paidAt,
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
    ],
  );

  const navigateToPendingConfirmationScreen = useCallback(() => {
    if (hasNavigatedToPendingRef.current || hasNavigatedToSuccessRef.current) {
      return;
    }

    hasNavigatedToPendingRef.current = true;

    navigation.replace('PaymentPendingConfirmation', {
      bookingId: params.bookingId,
      orderCode: params.orderCode,
      amount: params.amount,
      paymentStatus: paymentStatusRef.current,
      bookingStatus: params.bookingStatus,
      tourName: params.tourName,
      tourTitle: params.tourName,
      scheduleDate: params.scheduleDate,
      numberOfPeople: params.numberOfPeople,
      confirmationMessage: 'Đang xác nhận thanh toán...',
    });
  }, [
    navigation,
    params.amount,
    params.bookingId,
    params.bookingStatus,
    params.numberOfPeople,
    params.orderCode,
    params.scheduleDate,
    params.tourName,
  ]);

  const handlePaymentResult = useCallback(
    (result: PaymentStatusResponse) => {
      if (!isMountedRef.current) return;

      const normalizedStatus = normalizePaymentStatus(
        result.paymentStatus ?? result.status ?? result.localPaymentStatus ?? result.remoteStatus,
      );

      setPaymentStatus(normalizedStatus);
      paymentStatusRef.current = normalizedStatus;

      if (isConfirmedPaymentResult(result)) {
        setStatusMessage('Thanh toan da duoc xac nhan boi backend.');
        navigateToSuccessScreen(result);
        return;
      }

      if (normalizedStatus === 'PENDING') {
        setStatusMessage('Dang cho backend xac nhan thanh toan.');
        return;
      }

      setStatusMessage(PAYMENT_STATUS_META[normalizedStatus].message);
    },
    [navigateToSuccessScreen],
  );

  const refreshPaymentStatus = useCallback(async () => {
    if (!hasOrderCode || hasNavigatedToPendingRef.current) {
      return null;
    }

    if (isRequestInFlightRef.current) {
      return null;
    }

    isRequestInFlightRef.current = true;

    try {
      const result = await paymentsApi.getPaymentStatusByOrderCode(parsedOrderCode);
      handlePaymentResult(result);
      return result;
    } catch (error) {
      if (!isMountedRef.current) return null;
      setStatusMessage(getErrorMessage(error));
      return null;
    } finally {
      isRequestInFlightRef.current = false;
    }
  }, [handlePaymentResult, hasOrderCode, parsedOrderCode]);

  const startPendingConfirmation = useCallback(() => {
    if (!hasOrderCode || hasNavigatedToSuccessRef.current || hasNavigatedToPendingRef.current) {
      return;
    }

    clearPollingTimeout();
    webViewRef.current?.stopLoading();
    setIsWebViewLoading(false);
    setWebViewError(null);
    setStatusMessage('Đang xác nhận thanh toán...');
    navigateToPendingConfirmationScreen();
  }, [clearPollingTimeout, hasOrderCode, navigateToPendingConfirmationScreen]);

  const verifyCallbackAndRefresh = useCallback(
    async (url: string, kind: Exclude<CallbackKind, null>) => {
      console.log('[Payment] callback url:', url);

      if (callbackVerificationInFlightRef.current) {
        return;
      }

      callbackVerificationInFlightRef.current = true;

      try {
        webViewRef.current?.stopLoading();
        setIsWebViewLoading(false);
        setWebViewError(null);

        if (kind === 'cancel') {
          clearPollingTimeout();
          setPaymentStatus('CANCELLED');
          paymentStatusRef.current = 'CANCELLED';
          setStatusMessage('Da nhan callback huy thanh toan.');
          navigation.goBack();
          return;
        }

        startPendingConfirmation();
      } finally {
        callbackVerificationInFlightRef.current = false;
      }
    },
    [clearPollingTimeout, navigation, startPendingConfirmation],
  );

  const interceptCallbackUrl = useCallback(
    (url?: string | null) => {
      if (!url) return false;

      const callbackKind = getCallbackKind(url);
      if (!callbackKind) {
        return false;
      }

      void verifyCallbackAndRefresh(url, callbackKind);
      return true;
    },
    [verifyCallbackAndRefresh],
  );

  const handleWebViewMessage = useCallback(
    (rawData: string) => {
      let payload: WebViewMessagePayload | null = null;

      try {
        payload = JSON.parse(rawData) as WebViewMessagePayload;
      } catch {
        return;
      }

      if (payload?.href && interceptCallbackUrl(payload.href)) {
        return;
      }

      if (payload?.type === 'PAYOS_SUCCESS_PAGE') {
        startPendingConfirmation();
        return;
      }

      if (pageBodyLooksSuccessful(payload?.bodyText)) {
        const fallbackUrl = payload?.href ?? params.checkoutUrl ?? '';
        void verifyCallbackAndRefresh(fallbackUrl, 'success');
      }
    },
    [interceptCallbackUrl, params.checkoutUrl, startPendingConfirmation, verifyCallbackAndRefresh],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearPollingTimeout();
    };
  }, [clearPollingTimeout]);

  useEffect(() => {
    clearPollingTimeout();

    if (!hasRequiredParams || isTerminalStatus(paymentStatus) || hasNavigatedToPendingRef.current) {
      return;
    }

    const poll = async () => {
      await refreshPaymentStatus();

      if (
        !isMountedRef.current ||
        isTerminalStatus(paymentStatusRef.current) ||
        hasNavigatedToPendingRef.current
      ) {
        return;
      }

      pollingTimeoutRef.current = setTimeout(() => {
        void poll();
      }, POLLING_INTERVAL_MS);
    };

    void poll();

    return () => {
      clearPollingTimeout();
    };
  }, [clearPollingTimeout, hasRequiredParams, paymentStatus, refreshPaymentStatus]);

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

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#0A2518" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toan PayOS</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing[6] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Tour</Text>
          <Text style={styles.tourName}>{params.tourName ?? 'Chua co thong tin tour'}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Lich khoi hanh</Text>
            <Text style={styles.value}>{params.scheduleDate ?? '--'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>So nguoi</Text>
            <Text style={styles.value}>{params.numberOfPeople ?? '--'}</Text>
          </View>
        </View>

        <View style={styles.webViewCard}>
          <Text style={styles.sectionLabel}>Trang thanh toan</Text>

          {!hasRequiredParams ? (
            <View style={styles.errorCard}>
              <Ionicons name="warning-outline" size={20} color="#B42318" />
              <Text style={styles.errorText}>
                Thieu checkoutUrl hoac orderCode. Khong the tiep tuc thanh toan cho booking nay.
              </Text>
            </View>
          ) : showWebView ? (
            <>
              <View style={styles.webViewContainer}>
                <WebView
                  ref={webViewRef}
                  source={{ uri: params.checkoutUrl! }}
                  startInLoadingState
                  injectedJavaScript={WEBVIEW_STATUS_INJECTION}
                  onLoadStart={() => {
                    setIsWebViewLoading(true);
                    setWebViewError(null);
                  }}
                  onMessage={event => {
                    handleWebViewMessage(event.nativeEvent.data);
                  }}
                  onNavigationStateChange={navState => {
                    if (navState.url) {
                      console.log('[Payment] callback url:', navState.url);
                      interceptCallbackUrl(navState.url);
                    }
                  }}
                  onShouldStartLoadWithRequest={request => {
                    console.log('[Payment] callback url:', request.url);
                    const isCallback = interceptCallbackUrl(request.url);
                    return !isCallback;
                  }}
                  onLoadEnd={() => {
                    setIsWebViewLoading(false);
                  }}
                  onError={event => {
                    const failedUrl = event.nativeEvent.url;
                    if (failedUrl && interceptCallbackUrl(failedUrl)) {
                      return;
                    }

                    setIsWebViewLoading(false);
                    setWebViewError('Khong the tai trang thanh toan. Ban co the tiep tuc cho backend xac nhan.');
                  }}
                  renderLoading={() => (
                    <View style={styles.webViewLoader}>
                      <ActivityIndicator size="large" color="#0A2518" />
                      <Text style={styles.webViewLoaderText}>Dang tai PayOS...</Text>
                    </View>
                  )}
                />

                {isWebViewLoading ? (
                  <View pointerEvents="none" style={styles.webViewOverlay}>
                    <ActivityIndicator size="small" color="#0A2518" />
                    <Text style={styles.webViewOverlayText}>Dang tai noi dung thanh toan...</Text>
                  </View>
                ) : null}
              </View>

              {webViewError ? <Text style={styles.webViewError}>{webViewError}</Text> : null}
              {statusMessage ? <Text style={styles.helperText}>{statusMessage}</Text> : null}
            </>
          ) : (
            <View style={styles.errorCard}>
              <Ionicons name="information-circle-outline" size={20} color="#0A2518" />
              <Text style={styles.errorText}>
                {statusMessage ?? 'Trang thanh toan duoc an vi giao dich khong con o trang thai cho xac nhan.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[5],
    gap: Spacing[4],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F53C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#0A2518',
  },
  content: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 24,
    padding: Spacing[5],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
  },
  sectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tourName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(10,37,24,0.08)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[4],
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.65)',
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  helperText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A2518',
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#7A271A',
    lineHeight: 20,
  },
  webViewCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
    marginTop: Spacing[1],
  },
  webViewContainer: {
    height: 620,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
  },
  webViewLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    backgroundColor: '#FFFFFF',
  },
  webViewLoaderText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  webViewOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  webViewOverlayText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },
  webViewError: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#B42318',
    lineHeight: 20,
  },
});
