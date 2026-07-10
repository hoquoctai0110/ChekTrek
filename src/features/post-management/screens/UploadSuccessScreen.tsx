import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'UploadSuccess'>;

export const UploadSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { type, title } = route.params;

  const isTour = type === 'tour';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const confirmItems = isTour
    ? [
        { icon: 'checkmark-circle-outline' as const, text: 'Tour đã được đăng lên hệ thống', color: Colors.successGreen },
        { icon: 'notifications-outline' as const, text: 'Khách hàng có thể tìm thấy tour của bạn', color: Colors.primary },
        { icon: 'stats-chart-outline' as const, text: 'Dữ liệu thống kê sẽ cập nhật sau 24h', color: Colors.warningAmber },
      ]
    : [
        { icon: 'checkmark-circle-outline' as const, text: 'Bài viết đã được đăng thành công', color: Colors.successGreen },
        { icon: 'people-outline' as const, text: 'Cộng đồng có thể đọc bài viết của bạn', color: Colors.primary },
        { icon: 'heart-outline' as const, text: 'Nhận thông báo khi có tương tác mới', color: Colors.error },
      ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      {/* ── Icon ── */}
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.outerRing}>
          <View style={[styles.innerCircle, { backgroundColor: isTour ? Colors.primary : Colors.successGreen }]}>
            <Ionicons
              name={isTour ? 'map' : 'newspaper'}
              size={44}
              color={Colors.onPrimary}
            />
          </View>
        </View>
      </Animated.View>

      {/* ── Text ── */}
      <Animated.View style={[styles.textWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>
          {isTour ? 'Tour đã đăng thành công!' : 'Bài viết đã đăng thành công!'}
        </Text>
        <Text style={styles.contentTitle} numberOfLines={2}>"{title}"</Text>
        <Text style={styles.subtitle}>
          {isTour
            ? 'Tour của bạn đang được xem xét và sẽ hiển thị với khách hàng trong thời gian sớm nhất.'
            : 'Bài viết của bạn đã được chia sẻ với cộng đồng Chektrek.'}
        </Text>
      </Animated.View>

      {/* ── Confirmation ── */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        {confirmItems.map((item, idx) => (
          <View key={idx} style={styles.confirmRow}>
            <View style={[styles.confirmIconBox, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={styles.confirmText}>{item.text}</Text>
          </View>
        ))}
      </Animated.View>

      <View style={{ flex: 1 }} />

      {/* ── Actions ── */}
      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate(isTour ? 'ManageTours' : 'ManagePosts')}
          activeOpacity={0.85}
        >
          <Ionicons name={isTour ? 'list-outline' : 'newspaper-outline'} size={18} color={Colors.onPrimary} />
          <Text style={styles.primaryBtnText}>
            {isTour ? 'Quản lý Tours' : 'Quản lý Bài viết'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    gap: Spacing[6],
  },
  iconWrapper: {},
  outerRing: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    ...(Shadows.lg as object),
  },
  textWrapper: { alignItems: 'center', gap: Spacing[3] },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onSurface,
    textAlign: 'center',
  },
  contentTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
    ...(Shadows.md as object),
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  confirmIconBox: {
    width: 38, height: 38, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  actions: { width: '100%', gap: Spacing[3] },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    ...(Shadows.md as object),
  },
  primaryBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
});
