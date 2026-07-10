/**
 * Chektrek Border Radius System
 */
export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,

  // Named tokens
  card: 16,
  button: 12,
  chip: 9999,
  input: 12,
  avatar: 9999,
  modal: 24,
  badge: 9999,
} as const;

export type RadiusKey = keyof typeof Radius;
