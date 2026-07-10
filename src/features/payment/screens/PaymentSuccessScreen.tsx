import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'PaymentSuccess'>;

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} d`;

export const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const displayTitle = params.tourTitle ?? params.tourName ?? 'Booking';
  const displayAmount = params.amount ?? 0;
  const displayPaymentId = String(params.paymentId ?? params.orderCode ?? '--');
  const displayPaidAt = params.paidAt ?? '--';
  const subtitleText = params.awaitingConfirmation
    ? params.confirmationMessage ?? 'Thanh toan thanh cong, he thong dang xac nhan.'
    : 'Don dat tour cua ban da duoc xac nhan.';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
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
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          Thanh toan thanh cong
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          {subtitleText}
        </Animated.Text>

        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <Svg width={188} height={188} viewBox="0 0 188 188">
            <Circle cx="94" cy="94" r="82" stroke="#0A7A4A" strokeWidth="10" fill="none" />
            <Path
              d="M52 95 L80 123 L136 67"
              stroke="#0A7A4A"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
          <Text style={styles.infoLabel}>Tour</Text>
          <Text style={styles.infoValue}>{displayTitle}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>So tien</Text>
          <Text style={styles.infoAmount}>{formatCurrency(displayAmount)}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Booking ID</Text>
          <Text style={styles.infoValue}>{String(params.bookingId)}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Payment ID</Text>
          <Text style={styles.infoTxn}>{displayPaymentId}</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Paid at</Text>
          <Text style={styles.infoValue}>{displayPaidAt}</Text>
          {params.scheduleDate ? (
            <>
              <View style={styles.infoDivider} />
              <Text style={styles.infoLabel}>Lich khoi hanh</Text>
              <Text style={styles.infoValue}>{params.scheduleDate}</Text>
            </>
          ) : null}
          {params.numberOfPeople !== undefined ? (
            <>
              <View style={styles.infoDivider} />
              <Text style={styles.infoLabel}>So nguoi</Text>
              <Text style={styles.infoValue}>{params.numberOfPeople}</Text>
            </>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.btnWrapper, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            activeOpacity={0.85}
          >
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
            <Text style={styles.homeBtnText}>Ve trang chu</Text>
          </TouchableOpacity>
        </Animated.View>
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
  },
  btnWrapper: {
    width: '100%',
    marginTop: Spacing[2],
  },
  homeBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#00F582',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  homeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    zIndex: 1,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 20,
    padding: Spacing[5],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
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
  infoTxn: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.72)',
    letterSpacing: 0.5,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(10,37,24,0.08)',
    marginVertical: Spacing[1],
  },
});
