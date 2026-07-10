/**
 * Chektrek Color Design System
 * Extracted from Stitch HTML design files
 */
export const Colors = {
  // ─── Primary ──────────────────────────────────────────────
  primary: '#0061a5',
  primaryContainer: '#0d99ff',
  primaryFixed: '#d2e4ff',
  primaryFixedDim: '#9fcaff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#002f55',
  onPrimaryFixed: '#001c37',
  onPrimaryFixedVariant: '#00497e',
  inversePrimary: '#9fcaff',

  // ─── Secondary ────────────────────────────────────────────
  secondary: '#5e5e5e',
  secondaryContainer: '#e2e2e2',
  secondaryFixed: '#e2e2e2',
  secondaryFixedDim: '#c6c6c6',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#646464',
  onSecondaryFixed: '#1b1b1b',
  onSecondaryFixedVariant: '#474747',

  // ─── Tertiary ─────────────────────────────────────────────
  tertiary: '#5b5f61',
  tertiaryContainer: '#929698',
  tertiaryFixed: '#e0e3e5',
  tertiaryFixedDim: '#c4c7c9',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#2b2f30',
  onTertiaryFixed: '#181c1e',
  onTertiaryFixedVariant: '#434749',

  // ─── Surface ──────────────────────────────────────────────
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceWhite: '#FFFFFF',
  surfaceVariant: '#d3e4fe',
  surfaceTint: '#0061a5',
  surfaceContainer: '#e5eeff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#3f4753',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',

  // ─── Background ───────────────────────────────────────────
  background: '#f8f9ff',
  onBackground: '#0b1c30',

  // ─── Outline ──────────────────────────────────────────────
  outline: '#707884',
  outlineVariant: '#bfc7d5',

  // ─── Error ────────────────────────────────────────────────
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // ─── Semantic ─────────────────────────────────────────────
  successGreen: '#10B981',
  warningAmber: '#F59E0B',
  dangerRed: '#EF4444',
  sosRed: '#FF4B4B',

  // ─── Transparent ──────────────────────────────────────────
  transparent: 'transparent',
  black: '#000000',
  white: '#ffffff',

  // ─── Difficulty Colors ────────────────────────────────────
  difficultyEasy: '#10B981',
  difficultyModerate: '#F59E0B',
  difficultyHard: '#EF4444',
  difficultyExtreme: '#7C3AED',
} as const;

export type ColorKey = keyof typeof Colors;
