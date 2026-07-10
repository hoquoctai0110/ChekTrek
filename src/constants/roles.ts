/**
 * Chektrek Role-Based Access Control Constants
 */
import { UserRole } from '@/types';

// ─── User Roles ───────────────────────────────────────────────────────────────
export const USER_ROLES = {
  TREKKER: 'TREKKER' as UserRole,
  TOUR_PROVIDER: 'TOUR_PROVIDER' as UserRole,
  ADMIN: 'ADMIN' as UserRole,
} as const;

// ─── Role Display Labels ───────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  TREKKER: 'Người leo núi',
  TOUR_PROVIDER: 'Nhà cung cấp tour',
  ADMIN: 'Quản trị viên',
};

// ─── Role Permissions ─────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  TREKKER: [
    'view_tours',
    'book_tours',
    'view_community',
    'create_posts',
    'use_ai_assistant',
    'track_trips',
  ],
  TOUR_PROVIDER: [
    'view_tours',
    'book_tours',
    'view_community',
    'create_posts',
    'use_ai_assistant',
    'track_trips',
    'manage_tours',
    'manage_posts',
    'view_analytics',
    'manage_pricing',
  ],
  ADMIN: ['*'], // Full access
};

// ─── Permission Checker ───────────────────────────────────────────────────────
export const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission);
};

export const isProvider = (role: UserRole): boolean =>
  role === USER_ROLES.TOUR_PROVIDER || role === USER_ROLES.ADMIN;

export const isAdmin = (role: UserRole): boolean => role === USER_ROLES.ADMIN;

