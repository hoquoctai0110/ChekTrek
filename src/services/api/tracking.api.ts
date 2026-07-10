import apiClient from './axios';
import { ApiResponse } from '../../types';

export interface TrackingStartResponse {
  trackingSessionId: number;
}

export type TrackingDirection = 'OUTBOUND' | 'RETURN';

export interface TrackingLocationRequest {
  trackingSessionId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  speed: number;
}

export interface TrackingPointResponse {
  id?: number;
  trackingSessionId?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  recordedAt?: string;
  createdAt?: string;
}

export interface TrackingSessionResponse {
  trackingSessionId?: number;
  id?: number;
  bookingId?: number;
  direction?: TrackingDirection | string;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | string;
  startedAt?: string;
  completedAt?: string;
  latestLocation?: TrackingPointResponse;
}

const unwrapData = <T>(responseData: ApiResponse<T> | T): T => {
  const maybeResponse = responseData as ApiResponse<T>;
  return maybeResponse?.data ?? (responseData as T);
};

const getValidBookingId = (bookingId: number): number | null => {
  const normalizedBookingId = Number(bookingId);
  return Number.isFinite(normalizedBookingId) && normalizedBookingId > 0 ? normalizedBookingId : null;
};

export const trackingApi = {
  startTracking: async (
    bookingId: number,
    direction: TrackingDirection = 'OUTBOUND',
  ): Promise<TrackingStartResponse> => {
    const { data } = await apiClient.post<
      ApiResponse<TrackingStartResponse> | TrackingStartResponse
    >('/tracking/start', { bookingId, direction });
    return unwrapData(data);
  },

  sendLocation: async (
    payload: TrackingLocationRequest,
  ): Promise<TrackingPointResponse | unknown> => {
    const { data } = await apiClient.post<
      ApiResponse<TrackingPointResponse> | TrackingPointResponse
    >('/tracking/location', payload);
    return unwrapData(data);
  },

  getTrackingSession: async (sessionId: number): Promise<TrackingSessionResponse> => {
    const { data } = await apiClient.get<
      ApiResponse<TrackingSessionResponse> | TrackingSessionResponse
    >(`/tracking/session/${sessionId}`);
    return unwrapData(data);
  },

  getLatestTrackingSessionByBooking: async (
    bookingId: number,
  ): Promise<TrackingSessionResponse | null> => {
    const normalizedBookingId = getValidBookingId(bookingId);
    if (normalizedBookingId === null) {
      console.warn('[trackingApi] Skipping latest-session request because bookingId is invalid', {
        bookingId,
      });
      return null;
    }

    const requestUrl = `/tracking/bookings/${normalizedBookingId}/latest-session`;
    console.log('[trackingApi] Requesting latest tracking session', {
      bookingId: normalizedBookingId,
      requestedUrl: `/api/v1${requestUrl}`,
    });

    try {
      const response = await apiClient.get<
        ApiResponse<TrackingSessionResponse | null> | TrackingSessionResponse | null
      >(requestUrl);
      const latestSession = unwrapData(response.data) ?? null;

      console.log('[trackingApi] Latest tracking session response', {
        bookingId: normalizedBookingId,
        requestedUrl: `/api/v1${requestUrl}`,
        httpStatus: response.status,
        latestSessionResponse: latestSession,
      });

      return latestSession;
    } catch (error) {
      const maybeAxiosError = error as {
        response?: { status?: number; data?: unknown };
      };
      console.log('[trackingApi] Latest tracking session request failed', {
        bookingId: normalizedBookingId,
        requestedUrl: `/api/v1${requestUrl}`,
        httpStatus: maybeAxiosError.response?.status ?? null,
        latestSessionResponse: maybeAxiosError.response?.data ?? null,
      });
      throw error;
    }
  },

  getLatestLocation: async (sessionId: number): Promise<TrackingPointResponse | null> => {
    const { data } = await apiClient.get<
      ApiResponse<TrackingPointResponse> | TrackingPointResponse
    >(`/tracking/session/${sessionId}/latest`);
    return unwrapData(data) ?? null;
  },

  getTrackingHistory: async (sessionId: number): Promise<TrackingPointResponse[]> => {
    const { data } = await apiClient.get<
      ApiResponse<TrackingPointResponse[]> | TrackingPointResponse[]
    >(`/tracking/session/${sessionId}/history`);
    const history = unwrapData(data);
    return Array.isArray(history) ? history : [];
  },

  completeTracking: async (sessionId: number): Promise<TrackingSessionResponse | unknown> => {
    const { data } = await apiClient.post<
      ApiResponse<TrackingSessionResponse> | TrackingSessionResponse
    >(`/tracking/session/${sessionId}/complete`);
    return unwrapData(data);
  },

  pauseTracking: async (sessionId: number): Promise<TrackingSessionResponse | unknown> => {
    const { data } = await apiClient.put<
      ApiResponse<TrackingSessionResponse> | TrackingSessionResponse
    >(`/tracking/sessions/${sessionId}/pause`);
    return unwrapData(data);
  },

  resumeTracking: async (sessionId: number): Promise<TrackingSessionResponse | unknown> => {
    const { data } = await apiClient.put<
      ApiResponse<TrackingSessionResponse> | TrackingSessionResponse
    >(`/tracking/sessions/${sessionId}/resume`);
    return unwrapData(data);
  },
};
