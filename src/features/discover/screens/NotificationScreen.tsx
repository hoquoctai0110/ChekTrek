import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';

const INITIAL_NOTIFICATIONS = [
  {
    id: '1',
    text: 'Đặt chỗ thành công tại **Tour leo núi Lảo Thần**. Chuẩn bị lên đường thôi nào!',
  },
  {
    id: '2',
    text: 'Lưu ý: Nhiệt độ tại đỉnh Fansipan đêm nay dự kiến xuống 5°C. Đừng quên mang theo áo giữ nhiệt và miếng dán giữ ấm.',
  },
  {
    id: '3',
    text: 'Hoàn thành xuất sắc! Bạn vừa kết thúc **cung Tà Năng**. Hãy để lại đánh giá cho Guide A Páo để nhận 50 điểm thưởng nhé.',
  },
];

const MORE_NOTIFICATIONS = [
  {
    id: '4',
    text: 'Chào mừng bạn đến với **Chektrek**! Khám phá ngay hàng trăm tour trekking kỳ thú.',
  },
  {
    id: '5',
    text: 'Ưu đãi đặc biệt: Nhận ngay **giảm giá 10%** cho tour trekking tiếp theo khi chia sẻ hành trình của bạn.',
  },
];

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLoadMore = () => {
    if (!isExpanded) {
      setNotifications([...INITIAL_NOTIFICATIONS, ...MORE_NOTIFICATIONS]);
      setIsExpanded(true);
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      setIsExpanded(false);
    }
  };

  const formatNotificationText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <Text key={index} style={styles.boldText}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Row ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#0A2518" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông báo</Text>
        </View>

        {/* ── Notification List ── */}
        <View style={styles.listContainer}>
          {notifications.map((item) => (
            <View key={item.id} style={styles.notificationItem}>
              <Text style={styles.notificationText}>
                {formatNotificationText(item.text)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Xem thêm / Xem bớt Button ── */}
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={handleLoadMore}
          activeOpacity={0.7}
        >
          <Text style={styles.moreBtnText}>
            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#0A2518"
            style={styles.moreIcon}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[6],
    gap: Spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginBottom: Spacing[2],
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F53C', // Lime yellow from image
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: '#0A2518',
  },
  listContainer: {
    gap: Spacing[4],
  },
  notificationItem: {
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 37, 24, 0.15)', // Subtle dark line divider
  },
  notificationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: '#0A2518',
    lineHeight: 22,
  },
  boldText: {
    fontFamily: FontFamily.bold,
    color: '#0A2518',
  },
  moreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[4],
    gap: Spacing[1],
  },
  moreBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
  },
  moreIcon: {
    marginTop: 2,
  },
});
