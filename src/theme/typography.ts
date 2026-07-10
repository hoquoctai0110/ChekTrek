import { Platform } from 'react-native';

/**
 * Chektrek Typography System
 * Based on Stitch design using Inter font family
 */

export const FontFamily = {
  regular: Platform.select({ ios: 'Inter-Regular', android: 'Inter_400Regular', default: 'Inter' }),
  medium: Platform.select({ ios: 'Inter-Medium', android: 'Inter_500Medium', default: 'Inter' }),
  semiBold: Platform.select({
    ios: 'Inter-SemiBold',
    android: 'Inter_600SemiBold',
    default: 'Inter',
  }),
  bold: Platform.select({ ios: 'Inter-Bold', android: 'Inter_700Bold', default: 'Inter' }),
  extraBold: Platform.select({
    ios: 'Inter-ExtraBold',
    android: 'Inter_800ExtraBold',
    default: 'Inter',
  }),
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
} as const;

export const LineHeight = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 34,
  '4xl': 40,
  '5xl': 44,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

/**
 * Predefined text style presets matching Stitch design tokens
 */
export const TextPresets = {
  displayLg: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['5xl'],
    lineHeight: LineHeight['5xl'],
    letterSpacing: LetterSpacing.tight,
  },
  headlineLg: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: LineHeight['3xl'],
    letterSpacing: -0.28,
  },
  headlineMd: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
  },
  headlineSm: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
  },
  bodyLg: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
  },
  bodyMd: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
  },
  labelMd: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    letterSpacing: 0.24,
  },
  labelSm: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
  },
} as const;
