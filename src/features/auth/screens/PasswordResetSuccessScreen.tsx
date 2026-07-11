import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { s, vs, ms } from '@utils/responsive';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

export const PasswordResetSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
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
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200' }}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* ── Success Icon with animation ── */}
        <Animated.View
          style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Outer ring */}
          <View style={styles.outerRing}>
            {/* Inner circle */}
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark" size={44} color={Colors.surfaceWhite} />
            </View>
          </View>
        </Animated.View>

        {/* ── Text ── */}
        <Animated.View style={[styles.textWrapper, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Mật khẩu đã được đặt lại!</Text>
          <Text style={styles.subtitle}>
            Mật khẩu của bạn đã được cập nhật thành công. Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
          </Text>
        </Animated.View>

        {/* ── Confirmation Card ── */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0A2518" />
            <Text style={styles.cardText}>Tài khoản của bạn đã được bảo mật</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="notifications-outline" size={20} color="#0A2518" />
            <Text style={styles.cardText}>Email xác nhận đã được gửi</Text>
          </View>
        </Animated.View>

        {/* ── Spacer ── */}
        <View style={{ flex: 1 }} />

        {/* ── Button ── */}
        <Animated.View style={[styles.btnWrapper, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(164, 219, 162, 0.75)', // Light green tint
  },
  root: {
    flex: 1,
    paddingHorizontal: s(Spacing[6]),
    alignItems: 'center',
    gap: vs(Spacing[6]),
  },
  iconWrapper: {
    marginTop: vs(Spacing[8]),
  },
  outerRing: {
    width: s(128),
    height: s(128),
    borderRadius: s(64),
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  innerCircle: {
    width: s(96),
    height: s(96),
    borderRadius: s(48),
    backgroundColor: '#0F291E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    alignItems: 'center',
    gap: vs(Spacing[3]),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize['2xl']),
    color: '#0A2518',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
    textAlign: 'center',
    lineHeight: vs(24),
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: Radius.xl,
    padding: s(Spacing[5]),
    gap: vs(Spacing[4]),
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(Spacing[3]),
  },
  cardText: {
    fontFamily: FontFamily.medium,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
    flex: 1,
  },
  btnWrapper: {
    width: '100%',
  },
  loginBtn: {
    backgroundColor: '#0F291E',
    borderRadius: Radius.button,
    paddingVertical: vs(Spacing[4]),
    alignItems: 'center',
  },
  loginBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize.base),
    color: Colors.surfaceWhite,
  },
});
