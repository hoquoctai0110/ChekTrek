import apiClient from './axios';
import { ApiResponse } from '@/types';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface CreateRoutePayload {
  routeName: string;
  polylineData: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
  difficulty?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  elevationGain?: number;
}

export interface CreateRouteResponse {
  routeId: number;
}

export interface RouteLocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
}

export type GeneratedRouteType = 'ONE_WAY' | 'ROUND_TRIP' | 'LOOP';

export interface GenerateRoutePayload {
  routeName: string;
  routeType: GeneratedRouteType;
  start: RouteLocationPayload;
  end: RouteLocationPayload;
  checkpoints: RouteLocationPayload[];
  difficulty?: string;
}

export interface GenerateRouteResponse {
  routeId: number;
  routeName?: string;
  polylineData?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
}

export interface TourRoute {
  routeId: number;
  routeName?: string;
  routeType?: GeneratedRouteType | string;
  polylineData?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
  difficulty?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
}

export type WaypointType = 'START' | 'CHECKPOINT' | 'END';

export interface CreateWaypointPayload {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: WaypointType;
  orderIndex: number;
  mandatory: boolean;
}

export interface RouteWaypoint {
  waypointId: number;
  routeId: number;
  name?: string;
  latitude: number;
  longitude: number;
  category?: string;
  orderIndex?: number;
}

const unwrapData = <T>(responseData: ApiResponse<T> | T): T => {
  const maybeResponse = responseData as ApiResponse<T>;
  return maybeResponse?.data ?? (responseData as T);
};

export const routesApi = {
  getRouteById: async (routeId: number): Promise<TourRoute> => {
    const { data } = await apiClient.get<ApiResponse<TourRoute> | TourRoute>(`/routes/${routeId}`);
    return unwrapData(data);
  },

  getWaypoints: async (routeId: number): Promise<RouteWaypoint[]> => {
    const { data } = await apiClient.get<ApiResponse<RouteWaypoint[]> | RouteWaypoint[]>(
      `/routes/${routeId}/waypoints`,
    );
    const waypoints = unwrapData(data);
    return Array.isArray(waypoints) ? waypoints : [];
  },

  createRoute: async (payload: CreateRoutePayload): Promise<CreateRouteResponse> => {
    const { data } = await apiClient.post<ApiResponse<CreateRouteResponse>>('/routes', payload);
    return data.data;
  },

  generateRoute: async (payload: GenerateRoutePayload): Promise<GenerateRouteResponse> => {
    console.log('[routesApi] POST /routes/generate request:', payload);

    try {
      const response = await apiClient.post<
        ApiResponse<GenerateRouteResponse> | GenerateRouteResponse
      >('/routes/generate', payload);

      console.log('[routesApi] POST /routes/generate response:', {
        status: response.status,
        data: response.data,
      });

      return unwrapData(response.data);
    } catch (error) {
      // Keep the original Axios error intact so callers can inspect the backend response.
      console.error('[routesApi] POST /routes/generate failed:', error);
      throw error;
    }
  },

  createWaypoint: async (routeId: number, payload: CreateWaypointPayload): Promise<unknown> => {
    const { data } = await apiClient.post(`/routes/${routeId}/waypoints`, payload);
    return data;
  },
};

