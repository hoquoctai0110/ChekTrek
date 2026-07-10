import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  API_BASE_URL,
  API_CONFIG_ERROR,
  API_ENDPOINTS,
  API_TIMEOUT,
  normalizeApiPath,
  resolveApiUrl,
  STORAGE_KEYS,
} from '@constants/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineMode } from '@services/offline/offlineMode';

// ─── Axios Instance ────────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

if (__DEV__) {
  console.log('[API] baseURL:', API_BASE_URL);
}

const SENSITIVE_KEYS = new Set(['password', 'confirmPassword', 'currentPassword', 'newPassword', 'otp']);

const sanitizeForLogs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLogs);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (acc, [key, currentValue]) => {
      acc[key] = SENSITIVE_KEYS.has(key) ? '***' : sanitizeForLogs(currentValue);
      return acc;
    },
    {},
  );
};

// ─── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (API_CONFIG_ERROR) {
      return Promise.reject(new Error(API_CONFIG_ERROR));
    }

    if (typeof config.url === 'string') {
      config.url = normalizeApiPath(config.url);
    }

    if (offlineMode.isEnabled()) {
      const networkState = await NetInfo.fetch();
      const isConnected =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isConnected) {
        console.log('[Offline] skipped API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
        });
        return Promise.reject(new Error('OFFLINE_MODE: API request skipped'));
      }
    }

    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log('[API] request:', {
        method: config.method?.toUpperCase(),
        url: resolveApiUrl(config.url),
        requestBody: sanitizeForLogs(config.data),
        hasAuthorization: !!token,
      });
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log('[API] response:', {
        method: response.config.method?.toUpperCase(),
        url: resolveApiUrl(response.config.url),
        status: response.status,
        message:
          typeof response.data?.message === 'string' ? response.data.message : undefined,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (__DEV__) {
      console.log('[API] error response:', {
        method: error.config?.method?.toUpperCase(),
        url: resolveApiUrl(error.config?.url),
        requestBody: sanitizeForLogs(error.config?.data),
        status: error.response?.status,
        responseMessage:
          typeof (error.response?.data as { message?: unknown } | undefined)?.message === 'string'
            ? (error.response?.data as { message?: string }).message
            : undefined,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      });
    }

    if (!error.response) {
      if (__DEV__) {
        console.log('[API] Network error details:', {
          baseURL: API_BASE_URL,
          url: resolveApiUrl(error.config?.url),
          method: error.config?.method,
          message: error.message,
          code: error.code,
        });
      }
    }

    // Handle 401 — attempt token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const networkState = await NetInfo.fetch();
        const isConnected =
          networkState.isConnected === true && networkState.isInternetReachable !== false;
        if (!isConnected) {
          console.log('[Offline] network disconnected');
          return Promise.reject(error);
        }

        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const { data } = await axios.post(resolveApiUrl(API_ENDPOINTS.AUTH_REFRESH), { refreshToken }, {
            timeout: API_TIMEOUT,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          const { accessToken } = data.data;
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        const networkState = await NetInfo.fetch();
        const isConnected =
          networkState.isConnected === true && networkState.isInternetReachable !== false;
        if (isConnected) {
          // Clear tokens only when the backend is reachable and rejects refresh.
          await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
