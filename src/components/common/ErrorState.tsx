import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { PrimaryButton } from '@components/buttons/PrimaryButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message = 'Vui lòng thử lại sau.',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle-outline" size={64} color={Colors.dangerRed} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <PrimaryButton
          title="Thử lại"
          onPress={onRetry}
          style={styles.button}
          variant="outline"
        />
      )}
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
  button: {
    marginTop: Spacing[2],
    minWidth: 140,
  },
});
