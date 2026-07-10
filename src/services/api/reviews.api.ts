import apiClient from './axios';

export interface CreateReviewPayload {
  bookingId: number;
  tourId: number;
  rating: number;
  comment: string;
}

export interface TourReview {
  id: string;
  userId?: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

export interface TourReviewSummary {
  averageRating: number;
  reviewCount: number;
}

type BackendReview = {
  id?: string | number;
  reviewId?: string | number;
  userId?: string | number;
  trekkerId?: string | number;
  userName?: string;
  fullName?: string;
  trekkerName?: string;
  userAvatarUrl?: string;
  avatarUrl?: string;
  user?: { id?: string | number; fullName?: string; name?: string; avatarUrl?: string };
  trekker?: { id?: string | number; fullName?: string; name?: string; avatarUrl?: string };
  rating?: number | string;
  comment?: string;
  content?: string;
  createdAt?: string;
  reviewDate?: string;
};

const toNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const unwrapData = (responseData: unknown): unknown => {
  const root = responseData as { data?: unknown };
  return root?.data ?? responseData;
};

const normalizeReview = (review: BackendReview): TourReview => ({
  id: String(review.id ?? review.reviewId ?? ''),
  userId: String(review.userId ?? review.trekkerId ?? review.user?.id ?? review.trekker?.id ?? ''),
  userName:
    review.userName ??
    review.fullName ??
    review.trekkerName ??
    review.user?.fullName ??
    review.user?.name ??
    review.trekker?.fullName ??
    review.trekker?.name ??
    'Trekker',
  userAvatarUrl:
    review.userAvatarUrl ?? review.avatarUrl ?? review.user?.avatarUrl ?? review.trekker?.avatarUrl,
  rating: toNumber(review.rating),
  comment: review.comment ?? review.content ?? '',
  createdAt: review.createdAt ?? review.reviewDate,
});

const normalizeReviewList = (responseData: unknown): TourReview[] => {
  const payload = unwrapData(responseData);
  if (Array.isArray(payload)) return payload.map(item => normalizeReview(item));

  if (payload && typeof payload === 'object') {
    const collection = payload as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      reviews?: unknown;
    };
    const items = collection.data ?? collection.content ?? collection.items ?? collection.reviews;
    if (Array.isArray(items)) return items.map(item => normalizeReview(item));
  }

  return [];
};

const normalizeReviewSummary = (responseData: unknown): TourReviewSummary => {
  const payload = unwrapData(responseData) as {
    averageRating?: unknown;
    average?: unknown;
    rating?: unknown;
    reviewCount?: unknown;
    totalReviews?: unknown;
    count?: unknown;
  };

  return {
    averageRating: toNumber(payload?.averageRating ?? payload?.average ?? payload?.rating),
    reviewCount: toNumber(payload?.reviewCount ?? payload?.totalReviews ?? payload?.count),
  };
};

export const reviewsApi = {
  createReview: async (payload: CreateReviewPayload): Promise<void> => {
    await apiClient.post('/reviews', payload);
  },

  getTourReviews: async (tourId: string | number): Promise<TourReview[]> => {
    const { data } = await apiClient.get<unknown>(`/tours/${tourId}/reviews`);
    return normalizeReviewList(data);
  },

  getTourReviewSummary: async (tourId: string | number): Promise<TourReviewSummary> => {
    const { data } = await apiClient.get<unknown>(`/tours/${tourId}/reviews/summary`);
    return normalizeReviewSummary(data);
  },
};
