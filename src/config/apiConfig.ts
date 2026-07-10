const API_VERSION_PATH = '/api/v1';
const API_PREFIX_PATTERN = /^\/?api\/v1(?:\/|$)/i;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeConfiguredBaseUrl = (value: string): string => {
  const trimmedValue = trimTrailingSlash(value.trim());

  if (!trimmedValue || !ABSOLUTE_URL_PATTERN.test(trimmedValue)) {
    return '';
  }

  return trimmedValue.toLowerCase().endsWith(API_VERSION_PATH)
    ? trimmedValue
    : `${trimmedValue}${API_VERSION_PATH}`;
};

export const normalizeApiPath = (value: string = ''): string => {
  if (!value) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(value)) {
    return value;
  }

  const [rawPathname, rawQuery = ''] = value.split('?');
  const normalizedPathname = rawPathname
    .trim()
    .replace(API_PREFIX_PATTERN, '/')
    .replace(/^\/?/, '/')
    .replace(/\/{2,}/g, '/');

  return rawQuery ? `${normalizedPathname}?${rawQuery}` : normalizedPathname;
};

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const BASE_URL = normalizeConfiguredBaseUrl(configuredApiUrl);
export const API_BASE_URL = BASE_URL;
export const API_TIMEOUT = 30000;
export const API_CONFIG_ERROR = BASE_URL
  ? null
  : 'Missing or invalid EXPO_PUBLIC_API_URL. Expected an HTTPS production API origin or /api/v1 base URL.';

export const resolveApiUrl = (value: string = ''): string => {
  if (!value) {
    return BASE_URL;
  }

  if (ABSOLUTE_URL_PATTERN.test(value)) {
    return value;
  }

  return `${BASE_URL}${normalizeApiPath(value)}`;
};

export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_REGISTER_TREKKER: '/auth/register/trekker',
  AUTH_REGISTER_PROVIDER: '/auth/register/provider',
  AUTH_VERIFY_OTP: '/auth/verify-otp',
  AUTH_RESEND_OTP: '/auth/resend-otp',
  TOURS_PUBLISHED: '/tours/published',
  PAYMENTS_RETURN: '/payments/return',
  PAYMENTS_CANCEL: '/payments/cancel',
} as const;
