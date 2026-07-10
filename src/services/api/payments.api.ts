import apiClient from './axios';
import { ApiResponse, PaymentStatusResponse } from '../../types';

const toOptionalNumber = (value: unknown): number | undefined => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const unwrapPaymentStatus = (payload: unknown): PaymentStatusResponse => {
  const root = payload as { data?: unknown; success?: boolean };
  const nested = root?.data as { data?: unknown } | undefined;
  const candidate = (nested?.data ?? root?.data ?? payload) as PaymentStatusResponse & {
    status?: string;
    localPaymentStatus?: string;
    localBookingStatus?: string;
    remoteStatus?: string;
    success?: boolean;
  };

  return {
    bookingId: toOptionalNumber(candidate.bookingId),
    orderCode: toOptionalNumber(candidate.orderCode),
    amount: toOptionalNumber(candidate.amount),
    localPaymentStatus: candidate.localPaymentStatus,
    localBookingStatus: candidate.localBookingStatus,
    remoteStatus: candidate.remoteStatus,
    paymentStatus:
      candidate.paymentStatus ??
      candidate.localPaymentStatus ??
      candidate.remoteStatus ??
      candidate.status,
    bookingStatus: candidate.bookingStatus ?? candidate.localBookingStatus,
    status: candidate.status,
    success: candidate.success ?? root.success,
    paymentId: candidate.paymentId,
    paidAt: candidate.paidAt,
    tourTitle: candidate.tourTitle,
  };
};

export const paymentsApi = {
  getPaymentStatus: async (orderCode: number): Promise<PaymentStatusResponse> => {
    const { data } = await apiClient.get<ApiResponse<PaymentStatusResponse> | PaymentStatusResponse>(
      `/payments/${orderCode}`,
    );

    return unwrapPaymentStatus(data);
  },

  getPaymentStatusByOrderCode: async (
    orderCode: number | string,
  ): Promise<PaymentStatusResponse> => {
    return paymentsApi.getPaymentStatus(Number(orderCode));
  },

  syncPaymentStatus: async (orderCode: number): Promise<PaymentStatusResponse> => {
    const { data } = await apiClient.post<ApiResponse<PaymentStatusResponse> | PaymentStatusResponse>(
      `/payments/${orderCode}/sync`,
    );

    return unwrapPaymentStatus(data);
  },

  syncPaymentStatusByOrderCode: async (
    orderCode: number | string,
  ): Promise<PaymentStatusResponse> => {
    return paymentsApi.syncPaymentStatus(Number(orderCode));
  },
};
