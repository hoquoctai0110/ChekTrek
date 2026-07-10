import apiClient from './axios';
import {
  Tour,
  Destination,
  Review,
  ApiResponse,
  PaginatedResponse,
  TourFilters,
} from '../../types';

export interface MyTourPayload {
  routeId: number;
  title: string;
  description: string;
  price: number;
  maxParticipants: number;
  difficulty: string;
  duration: number;
  meetingPoint: string;
  startDate: string;
  endDate: string;
}

const normalizePaginatedTours = (responseData: unknown): PaginatedResponse<Tour> => {
  const root = responseData as {
    data?: unknown;
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
  const payload = root?.data;

  if (Array.isArray(payload)) {
    return {
      data: payload as Tour[],
      total: root.total ?? payload.length,
      page: root.page ?? 1,
      limit: root.limit ?? payload.length,
      hasMore: root.hasMore ?? false,
    };
  }

  if (payload && typeof payload === 'object') {
    const paginated = payload as PaginatedResponse<Tour>;
    if (Array.isArray(paginated.data)) {
      return paginated;
    }
  }

  if (Array.isArray(responseData)) {
    return {
      data: responseData as Tour[],
      total: responseData.length,
      page: 1,
      limit: responseData.length,
      hasMore: false,
    };
  }

  return {
    data: [],
    total: 0,
    page: root?.page ?? 1,
    limit: root?.limit ?? 0,
    hasMore: root?.hasMore ?? false,
  };
};

const normalizeTour = (responseData: unknown): Tour => {
  const root = responseData as { data?: unknown };
  return (root?.data ?? responseData) as Tour;
};

export const toursApi = {
  getAll: async (filters?: TourFilters): Promise<PaginatedResponse<Tour>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Tour>> | Tour[]>('/tours', {
      params: filters,
    });
    return normalizePaginatedTours(data);
  },

  getById: async (id: string): Promise<Tour> => {
    const { data } = await apiClient.get<ApiResponse<Tour> | Tour>(`/tours/${id}`);
    return normalizeTour(data);
  },

  getFeatured: async (): Promise<Tour[]> => {
    const { data } = await apiClient.get<ApiResponse<Tour[]>>('/tours/featured');
    return data.data;
  },

  getMyTours: async (): Promise<Tour[]> => {
    const { data } = await apiClient.get<ApiResponse<Tour[]>>('/tours/me');
    return data.data;
  },

  createMyTour: async (payload: MyTourPayload): Promise<Tour> => {
    const { data } = await apiClient.post<ApiResponse<Tour>>('/tours/me', payload);
    return data.data;
  },

  updateMyTour: async (tourId: string, payload: MyTourPayload): Promise<Tour> => {
    const { data } = await apiClient.put<ApiResponse<Tour>>(`/tours/me/${tourId}`, payload);
    return data.data;
  },

  deleteMyTour: async (tourId: string): Promise<void> => {
    await apiClient.delete(`/tours/me/${tourId}`);
  },

  search: async (query: string, filters?: TourFilters): Promise<PaginatedResponse<Tour>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Tour>>>('/tours/search', {
      params: { q: query, ...filters },
    });
    return data.data;
  },

  getReviews: async (tourId: string): Promise<Review[]> => {
    const { data } = await apiClient.get<ApiResponse<Review[]>>(`/tours/${tourId}/reviews`);
    return data.data;
  },

  addReview: async (
    tourId: string,
    payload: { rating: number; comment: string },
  ): Promise<Review> => {
    const { data } = await apiClient.post<ApiResponse<Review>>(
      `/tours/${tourId}/reviews`,
      payload,
    );
    return data.data;
  },

  getDestinations: async (): Promise<Destination[]> => {
    const { data } = await apiClient.get<ApiResponse<Destination[]>>('/destinations');
    return data.data;
  },

  getFeaturedDestinations: async (): Promise<Destination[]> => {
    const { data } = await apiClient.get<ApiResponse<Destination[]>>('/destinations/featured');
    return data.data;
  },
};
