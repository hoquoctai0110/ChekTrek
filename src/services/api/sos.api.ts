import apiClient from './axios';

export type SosPayload = {
  bookingId?: number;
  trackingSessionId?: number | string;
  latitude: number;
  longitude: number;
  message: string;
  source: 'API';
  clientCreatedAt: string;
};

export type ProviderSosStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface ProviderSosAlert {
  sosId: string;
  bookingId?: number;
  trackingSessionId?: number | string;
  routeId?: number;
  trekkerName?: string;
  trekkerEmail?: string;
  tourTitle?: string;
  latitude?: number;
  longitude?: number;
  message: string;
  status: ProviderSosStatus;
  createdAt?: string;
}

type BackendProviderSosAlert = {
  sosId?: string | number;
  id?: string | number;
  bookingId?: string | number;
  trackingSessionId?: string | number;
  routeId?: string | number;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  lon?: number | string;
  message?: string;
  status?: string;
  createdAt?: string;
  clientCreatedAt?: string;
  trekkerName?: string;
  trekkerEmail?: string;
  userName?: string;
  userEmail?: string;
  customerName?: string;
  customerEmail?: string;
  trekker?: { fullName?: string; name?: string; email?: string };
  user?: { fullName?: string; name?: string; email?: string };
  booking?: {
    bookingId?: string | number;
    id?: string | number;
    tourTitle?: string;
    tourName?: string;
  };
  location?: {
    latitude?: number | string;
    longitude?: number | string;
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
  };
  coordinate?: {
    latitude?: number | string;
    longitude?: number | string;
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
  };
  coordinates?: {
    latitude?: number | string;
    longitude?: number | string;
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
  };
  tourTitle?: string;
  tourName?: string;
};

const toNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const extractLatitude = (alert: BackendProviderSosAlert): number | undefined =>
  toOptionalNumber(
    alert.latitude ??
      alert.lat ??
      alert.location?.latitude ??
      alert.location?.lat ??
      alert.coordinate?.latitude ??
      alert.coordinate?.lat ??
      alert.coordinates?.latitude ??
      alert.coordinates?.lat,
  );

const extractLongitude = (alert: BackendProviderSosAlert): number | undefined =>
  toOptionalNumber(
    alert.longitude ??
      alert.lng ??
      alert.lon ??
      alert.location?.longitude ??
      alert.location?.lng ??
      alert.location?.lon ??
      alert.coordinate?.longitude ??
      alert.coordinate?.lng ??
      alert.coordinate?.lon ??
      alert.coordinates?.longitude ??
      alert.coordinates?.lng ??
      alert.coordinates?.lon,
  );

const normalizeProviderSosStatus = (value: unknown): ProviderSosStatus => {
  const status = String(value ?? 'PENDING').toUpperCase();
  if (status === 'ACKNOWLEDGED') return 'ACKNOWLEDGED';
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
};

const normalizeProviderSosAlert = (alert: BackendProviderSosAlert): ProviderSosAlert => ({
  sosId: String(alert.sosId ?? alert.id ?? ''),
  bookingId: Number.isFinite(Number(alert.bookingId ?? alert.booking?.bookingId ?? alert.booking?.id))
    ? Number(alert.bookingId ?? alert.booking?.bookingId ?? alert.booking?.id)
    : undefined,
  trackingSessionId: alert.trackingSessionId,
  routeId: Number.isFinite(Number(alert.routeId)) ? Number(alert.routeId) : undefined,
  trekkerName:
    alert.trekkerName ??
    alert.userName ??
    alert.customerName ??
    alert.trekker?.fullName ??
    alert.trekker?.name ??
    alert.user?.fullName ??
    alert.user?.name,
  trekkerEmail: alert.trekkerEmail ?? alert.userEmail ?? alert.customerEmail ?? alert.trekker?.email ?? alert.user?.email,
  tourTitle: alert.tourTitle ?? alert.tourName ?? alert.booking?.tourTitle ?? alert.booking?.tourName,
  latitude: extractLatitude(alert),
  longitude: extractLongitude(alert),
  message: alert.message ?? '',
  status: normalizeProviderSosStatus(alert.status),
  createdAt: alert.createdAt ?? alert.clientCreatedAt,
});

const normalizeProviderSosList = (responseData: unknown): ProviderSosAlert[] => {
  const root = responseData as { data?: unknown };
  const payload = root?.data ?? responseData;

  if (Array.isArray(payload)) return payload.map(item => normalizeProviderSosAlert(item));

  if (payload && typeof payload === 'object') {
    const collection = payload as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      alerts?: unknown;
      sosAlerts?: unknown;
    };
    const items =
      collection.data ??
      collection.content ??
      collection.items ??
      collection.alerts ??
      collection.sosAlerts;

    if (Array.isArray(items)) return items.map(item => normalizeProviderSosAlert(item));
  }

  return [];
};

export const sosApi = {
  createSos: async (payload: SosPayload): Promise<void> => {
    await apiClient.post('/sos', payload);
    console.log('[SOS] api sent');
  },

  getProviderSos: async (): Promise<ProviderSosAlert[]> => {
    const { data } = await apiClient.get<unknown>('/sos/provider');
    return normalizeProviderSosList(data);
  },

  getProviderSosById: async (sosId: string): Promise<ProviderSosAlert | null> => {
    const alerts = await sosApi.getProviderSos();
    return alerts.find(alert => alert.sosId === sosId) ?? null;
  },

  acknowledgeSos: async (sosId: string): Promise<void> => {
    await apiClient.put(`/sos/${sosId}/acknowledge`);
  },

  resolveSos: async (sosId: string): Promise<void> => {
    await apiClient.put(`/sos/${sosId}/resolve`);
  },

  sendSos: async (payload: SosPayload): Promise<void> => {
    await sosApi.createSos(payload);
  },
};

export const hasValidSosCoordinates = (
  alert: Pick<ProviderSosAlert, 'latitude' | 'longitude'> | null | undefined,
): alert is Pick<ProviderSosAlert, 'latitude' | 'longitude'> & {
  latitude: number;
  longitude: number;
} =>
  !!alert &&
  Number.isFinite(alert.latitude) &&
  Number.isFinite(alert.longitude);
