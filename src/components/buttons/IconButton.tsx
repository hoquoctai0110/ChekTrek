import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';
import { Shadows } from '@theme/shadows';

interface IconButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  variant?: 'filled' | 'ghost' | 'surface';
}

export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  icon,
  size = 44,
  backgroundColor,
  style,
  variant = 'surface',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'filled' && styles.filled,
        variant === 'surface' && styles.surface,
        backgroundColor ? { backgroundColor } : undefined,
        ...(variant === 'filled' ? [Shadows.sm as ViewStyle] : []),
        style,
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: Colors.primary,
  },
  surface: {
    backgroundColor: Colors.surfaceContainer,
  },
});
