import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'folder-open-outline',
  title = 'Không có dữ liệu',
  message = 'Hiện chưa có nội dung nào.',
  style,
  children,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={56} color={Colors.outlineVariant} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    gap: Spacing[3],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
});
