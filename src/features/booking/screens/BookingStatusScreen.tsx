import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { RootStackParamList } from '@navigation/types';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'BookingStatus'>;

export const BookingStatusScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { status } = route.params;

  const handleGoHome = () => {
    navigation.navigate('Main', { screen: 'Home' });
  };

  const isSuccess = status === 'success';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* ── Gradient Background ── */}
      <View style={StyleSheet.absoluteFill}>
        {isSuccess ? (
          <Svg height="100%" width="100%">
            <Defs>
              <SvgLinearGradient id="successGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#E5F9CE" />
                <Stop offset="100%" stopColor="#A2EDB4" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#successGrad)" />
          </Svg>
        ) : (
          <Svg height="100%" width="100%">
            <Defs>
              <SvgLinearGradient id="rejectGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFD6D6" />
                <Stop offset="100%" stopColor="#FFF5F5" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#rejectGrad)" />
          </Svg>
        )}
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 32 }]}>
        {/* ── Title ── */}
        <Text style={[styles.title, isSuccess ? styles.titleSuccess : styles.titleReject]}>
          {isSuccess ? 'Nhận tour thành công!' : 'Đã từ chối yêu cầu!'}
        </Text>

        {/* ── Icon Circle ── */}
        <View style={styles.iconWrapper}>
          <View style={[styles.iconCircle, isSuccess ? styles.circleSuccess : styles.circleReject]}>
            <Ionicons
              name={isSuccess ? 'checkmark' : 'close'}
              size={isSuccess ? 80 : 90}
              color={isSuccess ? '#0A2518' : '#EF4444'}
            />
          </View>
        </View>

        {/* ── Subtitle ── */}
        <Text style={[styles.subtitle, isSuccess ? styles.subSuccess : styles.subReject]}>
          {isSuccess
            ? 'Chúc bạn có một chuyến đi thành công!'
            : 'Yêu cầu tham gia đã được từ chối.\nTrekker sẽ được thông báo.'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* ── CTA Button ── */}
        {isSuccess ? (
          <TouchableOpacity
            style={styles.homeBtnSuccess}
            onPress={handleGoHome}
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
                <Rect width="100%" height="100%" fill="url(#btnGrad)" rx={22} ry={22} />
              </Svg>
            </View>
            <Text style={styles.btnTextSuccess}>Về trang chủ</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.homeBtnReject}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTextReject}>Về trang chủ</Text>
          </TouchableOpacity>
        )}
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
    paddingHorizontal: Spacing[6],
    gap: Spacing[8],
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    textAlign: 'center',
  },
  titleSuccess: {
    color: '#0A2518',
  },
  titleReject: {
    color: '#EF4444',
  },
  iconWrapper: {
    marginTop: Spacing[4],
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleSuccess: {
    borderColor: '#0A2518',
  },
  circleReject: {
    borderColor: '#EF4444',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing[2],
  },
  subSuccess: {
    color: '#0A2518',
  },
  subReject: {
    color: '#EF4444',
  },
  homeBtnSuccess: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  btnTextSuccess: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
    zIndex: 1,
  },
  homeBtnReject: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  btnTextReject: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#EF4444',
  },
});
