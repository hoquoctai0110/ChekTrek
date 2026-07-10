import apiClient from './axios';
import { Booking, ApiResponse, CreateBookingResponse, PaginatedResponse } from '../../types';

export interface CreateBookingPayload {
  tourId: number;
  scheduleId: number;
  numberOfPeople: number;
  note: string;
}

export interface MyBooking {
  id: string;
  tourId?: number;
  routeId?: number;
  tourTitle: string;
  scheduleDateTime?: string;
  numberOfPeople: number;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  createdAt?: string;
  trekkerName?: string;
  trekkerEmail?: string;
  providerName?: string;
  scheduleEndDateTime?: string;
  note?: string;
  meetingPoint?: string;
}

type BackendMyBooking = {
  id?: string | number;
  bookingId?: string | number;
  tourId?: string | number;
  tourTitle?: string;
  tourName?: string;
  scheduleDateTime?: string;
  scheduleDate?: string;
  startDateTime?: string;
  date?: string;
  numberOfPeople?: number | string;
  participants?: number | string;
  participantCount?: number | string;
  totalAmount?: number | string;
  totalPrice?: number | string;
  amount?: number | string;
  currency?: string;
  status?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  payment?: { status?: string };
  createdAt?: string;
  trekkerName?: string;
  trekkerEmail?: string;
  userName?: string;
  userEmail?: string;
  customerName?: string;
  customerEmail?: string;
  user?: { fullName?: string; name?: string; email?: string };
  trekker?: { fullName?: string; name?: string; email?: string };
  providerName?: string;
  guideName?: string;
  provider?: { fullName?: string; name?: string };
  endDateTime?: string;
  scheduleEndDateTime?: string;
  schedule?: {
    startDateTime?: string;
    startDate?: string;
    departureDate?: string;
    endDateTime?: string;
    endDate?: string;
  };
  note?: string;
  notes?: string;
  meetingPoint?: string;
  tour?: {
    id?: string | number;
    tourId?: string | number;
    routeId?: string | number;
    title?: string;
    name?: string;
    meetingPoint?: string;
  };
  routeId?: string | number;
  route?: { id?: string | number; routeId?: string | number };
};

const toNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeMyBooking = (booking: BackendMyBooking): MyBooking => ({
  id: String(booking.id ?? booking.bookingId ?? ''),
  tourId: Number.isFinite(Number(booking.tourId ?? booking.tour?.id ?? booking.tour?.tourId))
    ? Number(booking.tourId ?? booking.tour?.id ?? booking.tour?.tourId)
    : undefined,
  routeId: Number.isFinite(
    Number(booking.routeId ?? booking.tour?.routeId ?? booking.route?.id ?? booking.route?.routeId),
  )
    ? Number(
        booking.routeId ?? booking.tour?.routeId ?? booking.route?.id ?? booking.route?.routeId,
      )
    : undefined,
  tourTitle:
    booking.tourTitle ?? booking.tourName ?? booking.tour?.title ?? booking.tour?.name ?? 'Tour',
  scheduleDateTime:
    booking.scheduleDateTime ??
    booking.scheduleDate ??
    booking.startDateTime ??
    booking.date ??
    booking.schedule?.startDateTime ??
    booking.schedule?.startDate ??
    booking.schedule?.departureDate,
  numberOfPeople: toNumber(
    booking.numberOfPeople ?? booking.participants ?? booking.participantCount,
  ),
  totalAmount: toNumber(booking.totalAmount ?? booking.totalPrice ?? booking.amount),
  currency: booking.currency ?? 'VND',
  status: String(booking.status ?? booking.bookingStatus ?? 'UNKNOWN').toUpperCase(),
  paymentStatus: booking.paymentStatus ?? booking.payment?.status,
  createdAt: booking.createdAt,
  trekkerName:
    booking.trekkerName ??
    booking.userName ??
    booking.customerName ??
    booking.trekker?.fullName ??
    booking.trekker?.name ??
    booking.user?.fullName ??
    booking.user?.name,
  trekkerEmail:
    booking.trekkerEmail ??
    booking.userEmail ??
    booking.customerEmail ??
    booking.trekker?.email ??
    booking.user?.email,
  providerName:
    booking.providerName ??
    booking.guideName ??
    booking.provider?.fullName ??
    booking.provider?.name,
  scheduleEndDateTime:
    booking.scheduleEndDateTime ??
    booking.endDateTime ??
    booking.schedule?.endDateTime ??
    booking.schedule?.endDate,
  note: booking.note ?? booking.notes,
  meetingPoint: booking.meetingPoint ?? booking.tour?.meetingPoint,
});

const normalizeMyBookingResponse = (responseData: unknown): MyBooking => {
  const root = responseData as { data?: unknown };
  const payload = root?.data ?? responseData;
  const nested = payload as { data?: unknown };
  return normalizeMyBooking((nested?.data ?? payload) as BackendMyBooking);
};

const normalizeMyBookingList = (responseData: unknown): MyBooking[] => {
  const root = responseData as { data?: unknown };
  const payload = root?.data ?? responseData;

  if (Array.isArray(payload)) return payload.map(item => normalizeMyBooking(item));

  if (payload && typeof payload === 'object') {
    const collection = payload as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      bookings?: unknown;
    };
    const items = collection.data ?? collection.content ?? collection.items ?? collection.bookings;
    if (Array.isArray(items)) return items.map(item => normalizeMyBooking(item));
  }

  return [];
};

export const bookingsApi = {
  create: async (payload: CreateBookingPayload): Promise<CreateBookingResponse> => {
    console.log('[BookingsApi] POST /bookings payload =', payload);
    const { data } = await apiClient.post<ApiResponse<CreateBookingResponse> | CreateBookingResponse>(
      '/bookings',
      payload,
    );

    const root = data as { data?: unknown };
    const nested = root?.data as { data?: unknown } | undefined;
    const candidate = (nested?.data ?? root?.data ?? data) as CreateBookingResponse;

    return {
      bookingId: Number(candidate.bookingId),
      orderCode: Number(candidate.orderCode),
      checkoutUrl: String(candidate.checkoutUrl ?? ''),
      paymentStatus: candidate.paymentStatus,
      bookingStatus: candidate.bookingStatus,
    };
  },

  getAll: async (page = 1, limit = 10): Promise<PaginatedResponse<Booking>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Booking>>>('/bookings', {
      params: { page, limit },
    });
    return data.data;
  },

  getMyBookings: async (): Promise<MyBooking[]> => {
    const { data } = await apiClient.get<unknown>('/bookings/me');
    return normalizeMyBookingList(data);
  },

  getProviderBookings: async (): Promise<MyBooking[]> => {
    const { data } = await apiClient.get<unknown>('/bookings/provider');
    return normalizeMyBookingList(data);
  },

  getBookingById: async (bookingId: string): Promise<MyBooking> => {
    const { data } = await apiClient.get<unknown>(`/bookings/${bookingId}`);
    return normalizeMyBookingResponse(data);
  },

  cancelMyBooking: async (bookingId: string): Promise<void> => {
    await apiClient.put(`/bookings/me/${bookingId}/cancel`);
  },

  confirmBooking: async (bookingId: string): Promise<void> => {
    await apiClient.put(`/bookings/provider/${bookingId}/confirm`);
  },

  completeBooking: async (bookingId: string): Promise<void> => {
    await apiClient.put(`/bookings/provider/${bookingId}/complete`);
  },

  getById: async (id: string): Promise<Booking> => {
    const { data } = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return data.data;
  },

  cancel: async (id: string, reason?: string): Promise<Booking> => {
    const { data } = await apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`, {
      reason,
    });
    return data.data;
  },

  confirmPayment: async (id: string, paymentMethod: string): Promise<Booking> => {
    const { data } = await apiClient.post<ApiResponse<Booking>>(`/bookings/${id}/pay`, {
      paymentMethod,
    });
    return data.data;
  },
};
