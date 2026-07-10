import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { sosApi, SosPayload } from '@services/api/sos.api';
import { offlineSosQueue } from '@services/offline/offlineSosQueue';
import { useAuthStore } from '@store/authStore';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

type ActiveTrackingSession = {
  bookingId?: number;
  trackingSessionId?: number | string;
  tourTitle?: string;
};

const ACTIVE_TRACKING_KEY = '@chektrek/active-tracking-session';

const getSmsUrl = (phone: string | undefined, message: string): string => {
  const recipient = phone?.trim() ?? '';
  return `sms:${recipient}?body=${encodeURIComponent(message)}`;
};

export const SOSScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Đang lấy vị trí GPS...');
  const hasSentSosRef = useRef(false);

  // Pulse rings
  const pulse1 = useRef(new Animated.Value(0.95)).current;
  const pulse2 = useRef(new Animated.Value(0.95)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(Colors.sosRed);

    // Alternating pulse rings
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.08, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0.95, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(pulse2, { toValue: 1.12, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0.95, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const iconAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.05, duration: 3000, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
    );

    anim1.start();
    anim2.start();
    iconAnim.start();

    // Elapsed timer
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    return () => {
      anim1.stop();
      anim2.stop();
      iconAnim.stop();
      clearInterval(timer);
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor(Colors.background);
    };
  }, [iconScale, pulse1, pulse2]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getCurrentLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
  }, []);

  const getActiveTrackingSession = useCallback(async (): Promise<ActiveTrackingSession | null> => {
    try {
      const rawSession = await AsyncStorage.getItem(ACTIVE_TRACKING_KEY);
      return rawSession ? (JSON.parse(rawSession) as ActiveTrackingSession) : null;
    } catch {
      return null;
    }
  }, []);

  const buildSmsMessage = useCallback(
    ({
      payload,
      tourTitle,
    }: {
      payload: SosPayload;
      tourTitle?: string;
    }): string => {
      const mapsUrl = `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
      const lines = [
        'SOS CHEKTREK',
        payload.message,
        `Người dùng: ${user?.name ?? 'Không rõ'}`,
        user?.phone ? `SĐT: ${user.phone}` : undefined,
        user?.email ? `Email: ${user.email}` : undefined,
        tourTitle ? `Tour: ${tourTitle}` : undefined,
        payload.bookingId ? `Booking: ${payload.bookingId}` : undefined,
        payload.trackingSessionId ? `Tracking session: ${payload.trackingSessionId}` : undefined,
        `Vị trí: ${payload.latitude}, ${payload.longitude}`,
        `Bản đồ: ${mapsUrl}`,
        `Thời gian: ${new Date(payload.clientCreatedAt).toLocaleString('vi-VN')}`,
      ];

      return lines.filter(Boolean).join('\n');
    },
    [user?.email, user?.name, user?.phone],
  );

  const openSmsComposer = useCallback(async (
    phone: string | undefined,
    message: string,
  ): Promise<void> => {
    await Linking.openURL(getSmsUrl(phone, message));
    console.log('[SOS] sms opened');
  }, []);

  const queueAndOpenSms = useCallback(
    async ({
      payload,
      smsMessage,
      phone,
    }: {
      payload: SosPayload;
      smsMessage: string;
      phone?: string;
    }): Promise<void> => {
      await offlineSosQueue.enqueue({
        payload,
        smsMessage,
        recipientPhone: phone,
      });
      setStatusMessage('SOS đã được lưu và sẽ tự gửi khi có mạng.');
      Alert.alert('SOS đã được lưu', 'SOS đã được lưu và sẽ tự gửi khi có mạng.');

      try {
        await openSmsComposer(phone, smsMessage);
      } catch {
        setStatusMessage('SOS đã được lưu và sẽ tự gửi khi có mạng. Không thể mở SMS tự động.');
      }
    },
    [openSmsComposer],
  );

  const triggerSos = useCallback(async () => {
    try {
      const [gpsLocation, activeSession] = await Promise.all([
        getCurrentLocation(),
        getActiveTrackingSession(),
      ]);
      const clientCreatedAt = new Date().toISOString();
      setLocation({ lat: gpsLocation.latitude, lng: gpsLocation.longitude });

      const payload: SosPayload = {
        bookingId: activeSession?.bookingId,
        trackingSessionId: activeSession?.trackingSessionId,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        message: 'Tôi đang cần hỗ trợ khẩn cấp trên hành trình trekking.',
        source: 'API',
        clientCreatedAt,
      };
      const smsMessage = buildSmsMessage({
        payload,
        tourTitle: activeSession?.tourTitle,
      });
      const phone = user?.emergencyContact?.phone;
      const networkState = await NetInfo.fetch();
      const isConnected =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (isConnected) {
        try {
          await sosApi.createSos(payload);
          setStatusMessage('SOS đã được gửi tới hệ thống.');
          return;
        } catch {
          // Fall through to queue + SMS fallback.
        }
      }

      await queueAndOpenSms({ payload, smsMessage, phone });
    } catch {
      setStatusMessage('Không thể lấy vị trí GPS để gửi SOS. Vui lòng bật quyền vị trí và thử lại.');
      Alert.alert('Không thể gửi SOS', 'Vui lòng bật quyền vị trí để gửi SOS kèm vị trí hiện tại.');
    }
  }, [
    buildSmsMessage,
    getActiveTrackingSession,
    getCurrentLocation,
    queueAndOpenSms,
    user?.emergencyContact?.phone,
  ]);

  useEffect(() => {
    if (hasSentSosRef.current) return;
    hasSentSosRef.current = true;
    void triggerSos();
  }, [triggerSos]);

  const handleCancel = () => {
    Alert.alert(
      'Hủy tín hiệu SOS?',
      'Bạn có chắc chắn muốn dừng tín hiệu cấp cứu?',
      [
        { text: 'Tiếp tục SOS', style: 'cancel' },
        {
          text: 'Hủy tín hiệu',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* SOS Label */}
      <View style={styles.sosLabel}>
        <Text style={styles.sosLabelText}>SOS</Text>
      </View>

      {/* Central Content */}
      <View style={styles.centerContent}>
        {/* Pulse rings */}
        <Animated.View style={[styles.pulseRing, styles.outerRing, { transform: [{ scale: pulse1 }] }]} />
        <Animated.View style={[styles.pulseRing, styles.innerRing, { transform: [{ scale: pulse2 }] }]} />

        {/* Warning Icon */}
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="warning" size={140} color="rgba(255,255,255,0.95)" />
        </Animated.View>

        {/* Message */}
        <View style={styles.messageBlock}>
          <Text style={styles.mainMessage}>Đang gửi cảnh báo khẩn cấp</Text>
          <Text style={styles.mainMessageSub}>kèm vị trí của bạn</Text>
          <Text style={styles.subMessage}>{statusMessage}</Text>
        </View>

        {/* Signal Active */}
        <View style={styles.signalRow}>
          <View style={styles.signalDotContainer}>
            <View style={styles.signalDotPing} />
            <View style={styles.signalDot} />
          </View>
          <Text style={styles.signalText}>SIGNAL ACTIVE • {formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Location Indicator */}
      <View style={styles.locationBadge}>
        <Ionicons name="location" size={16} color={Colors.surfaceWhite} />
        <Text style={styles.locationText}>
          {location
            ? `Lat: ${location.lat.toFixed(4)}°N, Long: ${location.lng.toFixed(4)}°E`
            : 'Đang lấy vị trí GPS...'}
        </Text>
      </View>

      {/* Cancel Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.85}>
          <Text style={styles.cancelText}>Ngừng phát tín hiệu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosLabel: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
  },
  sosLabelText: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 12,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[5],
    paddingHorizontal: Spacing[6],
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderStyle: 'solid',
  },
  outerRing: {
    width: 340,
    height: 340,
    borderWidth: 50,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  innerRing: {
    width: 280,
    height: 280,
    borderWidth: 30,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  messageBlock: {
    alignItems: 'center',
    gap: Spacing[2],
    zIndex: 1,
  },
  mainMessage: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.surfaceWhite,
    textAlign: 'center',
  },
  mainMessageSub: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.surfaceWhite,
    textAlign: 'center',
  },
  subMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing[2],
    marginTop: Spacing[1],
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    zIndex: 1,
  },
  signalDotContainer: {
    width: 12,
    height: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalDotPing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceWhite,
    opacity: 0.5,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceWhite,
  },
  signalText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.surfaceWhite,
    letterSpacing: 2,
  },
  locationBadge: {
    position: 'absolute',
    bottom: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  locationText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: Spacing[5],
    right: Spacing[5],
  },
  cancelButton: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    paddingVertical: Spacing[4] + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.lg as object),
  },
  cancelText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.sosRed,
    letterSpacing: 0.3,
  },
});
