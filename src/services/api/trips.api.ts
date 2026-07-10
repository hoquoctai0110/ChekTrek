import apiClient from './axios';
import { Trip, Checkpoint, GeoLocation, ApiResponse, PaginatedResponse } from '@/types';

export const tripsApi = {
  getAll: async (page = 1, limit = 10): Promise<PaginatedResponse<Trip>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Trip>>>('/trips', {
      params: { page, limit },
    });
    return data.data;
  },

  getById: async (id: string): Promise<Trip> => {
    const { data } = await apiClient.get<ApiResponse<Trip>>(`/trips/${id}`);
    return data.data;
  },

  create: async (payload: Partial<Trip>): Promise<Trip> => {
    const { data } = await apiClient.post<ApiResponse<Trip>>('/trips', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<Trip>): Promise<Trip> => {
    const { data } = await apiClient.patch<ApiResponse<Trip>>(`/trips/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}`);
  },

  reachCheckpoint: async (tripId: string, checkpointId: string): Promise<Checkpoint> => {
    const { data } = await apiClient.post<ApiResponse<Checkpoint>>(
      `/trips/${tripId}/checkpoints/${checkpointId}/reach`,
    );
    return data.data;
  },

  updateLocation: async (tripId: string, location: GeoLocation): Promise<void> => {
    await apiClient.post(`/trips/${tripId}/location`, location);
  },

  sendSOS: async (tripId: string, location: GeoLocation): Promise<void> => {
    await apiClient.post(`/trips/${tripId}/sos`, { location });
  },
};

