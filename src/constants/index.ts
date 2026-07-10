/**
 * Chektrek Constants
 */
export {
  API_BASE_URL,
  API_CONFIG_ERROR,
  API_TIMEOUT,
  BASE_URL,
  API_ENDPOINTS,
  normalizeApiPath,
  resolveApiUrl,
} from '@/config/apiConfig';

// ─── API ──────────────────────────────────────────────────────────────────────
export const MAPBOX_PUBLIC_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
export const MAPBOX_CONFIG_ERROR = MAPBOX_PUBLIC_ACCESS_TOKEN
  ? null
  : 'Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@chektrek/access_token',
  REFRESH_TOKEN: '@chektrek/refresh_token',
  USER_PROFILE: '@chektrek/user_profile',
  ONBOARDING_DONE: '@chektrek/onboarding_done',
  LANGUAGE: '@chektrek/language',
  THEME: '@chektrek/theme',
  EMERGENCY_CONTACTS: '@chektrek/emergency_contacts',
  OFFLINE_CACHE: '@chektrek/offline_cache',
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  TOURS: ['tours'] as const,
  TOUR_DETAIL: (id: string) => ['tours', id] as const,
  FEATURED_TOURS: ['tours', 'featured'] as const,
  DESTINATIONS: ['destinations'] as const,
  TRIPS: ['trips'] as const,
  TRIP_DETAIL: (id: string) => ['trips', id] as const,
  POSTS: ['posts'] as const,
  POST_DETAIL: (id: string) => ['posts', id] as const,
  USER_PROFILE: ['user', 'profile'] as const,
  BOOKINGS: ['bookings'] as const,
  AI_CHAT: ['ai', 'chat'] as const,
};

// ─── Navigation Route Names ───────────────────────────────────────────────────
export const ROUTES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  OTP_VERIFY: 'OtpVerify',

  // Main Tabs
  HOME: 'Home',
  DISCOVER: 'Discover',
  COMMUNITY: 'Community',
  TREKKER: 'Trekker',
  PROFILE: 'Profile',

  // Stack Screens
  TOUR_DETAIL: 'TourDetail',
  BOOKING: 'Booking',
  AI_CHAT: 'AIChat',
  TRIP_MAP: 'TripMap',
  SOS: 'SOS',
  TRIP_DETAIL: 'TripDetail',
  SETTINGS: 'Settings',
  EDIT_PROFILE: 'EditProfile',
  PAYMENT_METHOD: 'PaymentMethod',
} as const;

// ─── App Config ───────────────────────────────────────────────────────────────
export const APP_CONFIG = {
  APP_NAME: 'Chektrek',
  VERSION: '1.0.0',
  CURRENCY: 'VND',
  DEFAULT_LANGUAGE: 'vi',
  MAP_ZOOM_LEVEL: 14,
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  SOS_HOLD_DURATION: 3000, // 3 seconds press
  PAGINATION_LIMIT: 10,
} as const;

// ─── Tour Categories ──────────────────────────────────────────────────────────
export const TOUR_CATEGORIES = [
  { id: 'mountain', label: 'Summit Tracks', icon: 'terrain', color: '#0061a5' },
  { id: 'forest', label: 'Forest Trails', icon: 'park', color: '#10B981' },
  { id: 'heritage', label: 'Heritage', icon: 'account_balance', color: '#F59E0B' },
  { id: 'all', label: 'Browse All', icon: 'grid_view', color: '#5e5e5e' },
] as const;

// ─── Difficulty Labels ────────────────────────────────────────────────────────
export const DIFFICULTY_CONFIG = {
  Easy: { label: 'Dễ', color: '#10B981', bgColor: '#D1FAE5' },
  Moderate: { label: 'Trung bình', color: '#F59E0B', bgColor: '#FEF3C7' },
  Hard: { label: 'Khó', color: '#EF4444', bgColor: '#FEE2E2' },
  Extreme: { label: 'Cực khó', color: '#7C3AED', bgColor: '#EDE9FE' },
} as const;

// ─── Mock Images (Placeholder URLs) ───────────────────────────────────────────
export const PLACEHOLDER_IMAGES = {
  TOUR: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
  AVATAR: 'https://i.pravatar.cc/150',
  DESTINATION: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  COVER: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200',
} as const;
