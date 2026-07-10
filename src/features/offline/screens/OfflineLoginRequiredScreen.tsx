import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';

export const OfflineLoginRequiredScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={42} color={Colors.warningAmber} />
        </View>
        <Text style={styles.title}>Cần đăng nhập lần đầu khi có mạng</Text>
        <Text style={styles.body}>
          Thiết bị đang offline và chưa có phiên đăng nhập được lưu. Hãy kết nối internet để đăng
          nhập lần đầu, sau đó bạn có thể dùng lộ trình đã tải khi mất mạng.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningAmber + '14',
  },
  title: {
    marginTop: Spacing[5],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  body: {
    marginTop: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 23,
  },
});
