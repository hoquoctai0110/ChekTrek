/**
 * Chektrek Spacing System
 */
export const Spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  // Named tokens from Stitch
  stackSm: 4,
  stackMd: 12,
  stackLg: 24,
  gutter: 16,
  containerMobile: 16,
  containerDesktop: 24,
  base: 8,
} as const;

export type SpacingKey = keyof typeof Spacing;
