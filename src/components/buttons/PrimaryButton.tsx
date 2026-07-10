import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[size],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        ...(variant === 'primary' ? [Shadows.md as ViewStyle] : []),
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.onPrimary : Colors.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.button,
  },
  // Sizes
  sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  md: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 52 },
  lg: { paddingVertical: 18, paddingHorizontal: 32, minHeight: 60 },

  // Variants
  variant_primary: { backgroundColor: Colors.primary },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  variant_ghost: { backgroundColor: 'transparent' },

  disabled: { opacity: 0.5 },

  // Text
  text: { fontFamily: FontFamily.semiBold, textAlign: 'center' },
  text_primary: { color: Colors.onPrimary },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },

  textSize_sm: { fontSize: FontSize.sm },
  textSize_md: { fontSize: FontSize.base },
  textSize_lg: { fontSize: FontSize.lg },
});
