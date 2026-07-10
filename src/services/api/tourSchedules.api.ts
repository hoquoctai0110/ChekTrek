import apiClient from './axios';
import { ApiResponse } from '../../types';

export type TourScheduleStatus = 'active' | 'cancelled' | 'completed' | 'draft';

export interface TourSchedule {
  id: string;
  tourId?: string;
  startDateTime: string;
  endDateTime: string;
  price?: number | null;
  maxParticipants: number;
  bookedCount: number;
  availableSlots: number;
  status: TourScheduleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertTourSchedulePayload {
  startDateTime: string;
  endDateTime: string;
  maxParticipants: number;
  price?: number;
  status?: TourScheduleStatus;
}

type BackendTourSchedule = Partial<TourSchedule> & {
  _id?: string;
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
  departureDate?: string;
  price?: number | string | null;
  maxParticipants?: number | string;
  bookedCount?: number | string;
  availableSlots?: number | string;
  remainingSlots?: number | string;
  slotsLeft?: number | string;
  status?: string;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeStatus = (value: unknown): TourScheduleStatus => {
  const status = String(value ?? 'active').toLowerCase();
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'draft') return 'draft';
  return 'active';
};

const normalizeSchedule = (schedule: BackendTourSchedule): TourSchedule => {
  const maxParticipants = Math.max(0, toNumber(schedule.maxParticipants));
  const bookedCount = Math.max(0, toNumber(schedule.bookedCount));
  const availableSlots = Math.max(
    0,
    toNumber(
      schedule.availableSlots ?? schedule.remainingSlots ?? schedule.slotsLeft,
      Math.max(0, maxParticipants - bookedCount),
    ),
  );

  return {
    id: String(schedule.id ?? schedule._id ?? schedule.scheduleId ?? ''),
    tourId: schedule.tourId,
    startDateTime: String(
      schedule.startDateTime ?? schedule.startDate ?? schedule.departureDate ?? '',
    ),
    endDateTime: String(schedule.endDateTime ?? schedule.endDate ?? ''),
    price:
      schedule.price === null || schedule.price === undefined ? null : toNumber(schedule.price),
    maxParticipants,
    bookedCount,
    availableSlots,
    status: normalizeStatus(schedule.status),
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
};

const normalizeScheduleList = (responseData: unknown): TourSchedule[] => {
  const root = responseData as { data?: unknown };
  const payload = root?.data ?? responseData;

  if (Array.isArray(payload)) return payload.map(item => normalizeSchedule(item));
  if (payload && typeof payload === 'object') {
    const maybeList = payload as { schedules?: unknown; items?: unknown };
    if (Array.isArray(maybeList.schedules))
      return maybeList.schedules.map(item => normalizeSchedule(item));
    if (Array.isArray(maybeList.items)) return maybeList.items.map(item => normalizeSchedule(item));
  }

  return [];
};

const normalizeScheduleResponse = (responseData: unknown): TourSchedule => {
  const root = responseData as { data?: unknown };
  return normalizeSchedule((root?.data ?? responseData) as BackendTourSchedule);
};

export const tourSchedulesApi = {
  getMine: async (tourId: string): Promise<TourSchedule[]> => {
    const { data } = await apiClient.get<ApiResponse<TourSchedule[]> | TourSchedule[]>(
      `/tours/${tourId}/schedules/me`,
    );
    return normalizeScheduleList(data);
  },

  getAvailable: async (tourId: string): Promise<TourSchedule[]> => {
    const { data } = await apiClient.get<ApiResponse<TourSchedule[]> | TourSchedule[]>(
      `/tours/${tourId}/schedules/available`,
    );
    return normalizeScheduleList(data);
  },

  create: async (tourId: string, payload: UpsertTourSchedulePayload): Promise<TourSchedule> => {
    const { data } = await apiClient.post<ApiResponse<TourSchedule>>(
      `/tours/${tourId}/schedules`,
      payload,
    );
    return normalizeScheduleResponse(data);
  },

  update: async (
    tourId: string,
    scheduleId: string,
    payload: UpsertTourSchedulePayload,
  ): Promise<TourSchedule> => {
    const { data } = await apiClient.put<ApiResponse<TourSchedule>>(
      `/tours/${tourId}/schedules/${scheduleId}`,
      payload,
    );
    return normalizeScheduleResponse(data);
  },

  delete: async (tourId: string, scheduleId: string): Promise<void> => {
    await apiClient.delete(`/tours/${tourId}/schedules/${scheduleId}`);
  },
};
