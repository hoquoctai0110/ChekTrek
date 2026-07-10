import { PLACEHOLDER_IMAGES } from '@constants/index';
import {
  formatTourDistance,
  formatTourDuration,
  formatTourRating,
  TOUR_DISPLAY_TEXT,
} from '@constants/tourDisplay';
import { Tour, TourDifficulty, TourStatus } from '@/types';
import { routesApi, TourRoute } from '@services/api/routes.api';
import { reviewsApi, TourReview } from '@services/api/reviews.api';
import { toursApi } from '@services/api/tours.api';

export type BackendPublicTour = Partial<Tour> & {
  id?: string | number;
  tourId?: string | number;
  routeId?: string | number | null;
  name?: string;
  tourName?: string;
  destinationName?: string;
  location?: string;
  meetingPoint?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  price?: number | string | null;
  estimatedDurationMin?: number | string | null;
  bookingsCount?: number | string | null;
  providerId?: string | number;
  providerName?: string;
  guide?: {
    id?: string | number;
    name?: string;
    avatarUrl?: string;
  };
};

export interface TourCardDisplayModel {
  title: string;
  location: string;
  imageUrl: string;
  distanceText: string;
  ratingText: string;
  durationText: string;
}

export interface TourRatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface PublicTourListItem {
  tour: Tour;
  tourId: number | null;
  routeId: number | null;
  providerId?: string;
  rawStatus?: string;
  card: TourCardDisplayModel;
  ratingSummary: TourRatingSummary;
}

type ReviewSummaryCacheEntry = TourRatingSummary & {
  fetchedAt: number;
};

type PublicTourLoaderOptions = {
  forceRefresh?: boolean;
  limit?: number;
};

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const REVIEW_CACHE_TTL_MS = 2 * 60 * 1000;
const REVIEW_CONCURRENCY_LIMIT = 5;

let routesCache: TourRoute[] | null = null;
let routesCacheFetchedAt = 0;
const reviewSummaryCache = new Map<string, ReviewSummaryCacheEntry>();

export const normalizePublicTourDifficulty = (value: unknown): TourDifficulty => {
  const difficulty = String(value ?? 'Moderate').toLowerCase();
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'Hard';
  if (difficulty === 'extreme') return 'Extreme';
  return 'Moderate';
};

export const normalizePublicTourStatus = (value: unknown): TourStatus => {
  const status = String(value ?? 'active').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'archived') return 'archived';
  return 'active';
};

export const toPublicTourNumber = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value ?? fallback);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toNullableInteger = (value: unknown): number | null => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.trunc(numericValue) : null;
};

export const toPublicTourStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const normalizeReviewRating = (value: unknown): number | null => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  if (numericValue < 1 || numericValue > 5) return null;
  return numericValue;
};

const summarizeReviews = (reviews: TourReview[]): TourRatingSummary => {
  const validRatings = reviews
    .map(review => normalizeReviewRating(review.rating))
    .filter((value): value is number => value !== null);

  if (validRatings.length === 0) {
    return { averageRating: null, reviewCount: 0 };
  }

  const total = validRatings.reduce((sum, value) => sum + value, 0);
  return {
    averageRating: total / validRatings.length,
    reviewCount: validRatings.length,
  };
};

const isRoutesCacheFresh = (): boolean =>
  routesCache !== null && Date.now() - routesCacheFetchedAt < ROUTE_CACHE_TTL_MS;

const isReviewSummaryFresh = (tourId: string): boolean => {
  const cachedSummary = reviewSummaryCache.get(tourId);
  return Boolean(cachedSummary && Date.now() - cachedSummary.fetchedAt < REVIEW_CACHE_TTL_MS);
};

const getOrLoadRoutes = async (forceRefresh = false): Promise<TourRoute[]> => {
  if (!forceRefresh && isRoutesCacheFresh()) {
    return routesCache ?? [];
  }

  const routes = await routesApi.getAllRoutes();
  routesCache = routes;
  routesCacheFetchedAt = Date.now();
  return routes;
};

const upsertRouteCache = (route: TourRoute): void => {
  const routeId = toNullableInteger(route.routeId);
  if (routeId === null) return;

  const currentRoutes = routesCache ?? [];
  const nextRoutes = currentRoutes.filter(existingRoute => toNullableInteger(existingRoute.routeId) !== routeId);
  nextRoutes.push(route);
  routesCache = nextRoutes;
  routesCacheFetchedAt = Date.now();
};

const buildRouteLookup = (routes: TourRoute[]): Map<number, TourRoute> => {
  const routeLookup = new Map<number, TourRoute>();

  routes.forEach(route => {
    const routeId = toNullableInteger(route.routeId);
    if (routeId !== null) {
      routeLookup.set(routeId, route);
    }
  });

  return routeLookup;
};

export const loadRouteLookup = async (forceRefresh = false): Promise<Map<number, TourRoute>> => {
  const routes = await getOrLoadRoutes(forceRefresh);
  return buildRouteLookup(routes);
};

export const loadRouteById = async (
  routeId: number,
  forceRefresh = false,
): Promise<TourRoute | null> => {
  if (!forceRefresh && isRoutesCacheFresh()) {
    const cachedRoute = buildRouteLookup(routesCache ?? []).get(routeId);
    if (cachedRoute) {
      return cachedRoute;
    }
  }

  try {
    const route = await routesApi.getRouteById(routeId);
    upsertRouteCache(route);
    return route;
  } catch (error) {
    if (!forceRefresh) {
      const fallbackRoute = buildRouteLookup(routesCache ?? []).get(routeId);
      if (fallbackRoute) {
        return fallbackRoute;
      }
    }

    throw error;
  }
};

export const getRouteDistanceKm = (route: TourRoute | null | undefined): number | null => {
  if (!route) return null;
  return toNullableNumber(route.distanceKm);
};

const createReviewSummaryCacheKey = (tourId: string | number): string => String(tourId);

const loadReviewSummary = async (
  tourId: string,
  forceRefresh = false,
): Promise<TourRatingSummary> => {
  if (!forceRefresh && isReviewSummaryFresh(tourId)) {
    const cachedSummary = reviewSummaryCache.get(tourId);
    if (cachedSummary) {
      return {
        averageRating: cachedSummary.averageRating,
        reviewCount: cachedSummary.reviewCount,
      };
    }
  }

  const reviews = await reviewsApi.getTourReviews(tourId);
  const summary = summarizeReviews(reviews);

  reviewSummaryCache.set(tourId, {
    ...summary,
    fetchedAt: Date.now(),
  });

  return summary;
};

const loadReviewSummaries = async (
  tourIds: string[],
  forceRefresh = false,
): Promise<Map<string, TourRatingSummary>> => {
  const summaryMap = new Map<string, TourRatingSummary>();
  const uniqueTourIds = Array.from(new Set(tourIds.filter(Boolean)));
  const pendingTourIds = uniqueTourIds.filter(tourId => forceRefresh || !isReviewSummaryFresh(tourId));

  uniqueTourIds.forEach(tourId => {
    const cachedSummary = reviewSummaryCache.get(tourId);
    if (cachedSummary && !forceRefresh) {
      summaryMap.set(tourId, {
        averageRating: cachedSummary.averageRating,
        reviewCount: cachedSummary.reviewCount,
      });
    }
  });

  for (let index = 0; index < pendingTourIds.length; index += REVIEW_CONCURRENCY_LIMIT) {
    const chunk = pendingTourIds.slice(index, index + REVIEW_CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(chunk.map(tourId => loadReviewSummary(tourId, forceRefresh)));

    results.forEach((result, resultIndex) => {
      const tourId = chunk[resultIndex];
      if (!tourId) return;

      if (result.status === 'fulfilled') {
        summaryMap.set(tourId, result.value);
        return;
      }

      const cachedSummary = reviewSummaryCache.get(tourId);
      summaryMap.set(tourId, {
        averageRating: cachedSummary?.averageRating ?? null,
        reviewCount: cachedSummary?.reviewCount ?? 0,
      });
    });
  }

  uniqueTourIds.forEach(tourId => {
    if (!summaryMap.has(tourId)) {
      summaryMap.set(tourId, { averageRating: null, reviewCount: 0 });
    }
  });

  return summaryMap;
};

export const invalidatePublicTourCardCache = (tourId?: string | number): void => {
  if (tourId === undefined || tourId === null) {
    routesCache = null;
    routesCacheFetchedAt = 0;
    reviewSummaryCache.clear();
    return;
  }

  reviewSummaryCache.delete(createReviewSummaryCacheKey(tourId));
};

export const getPublicTourStableId = (
  tour: Partial<Tour> & { tourId?: string | number },
  index?: number,
): string => {
  const stableId = tour.id ?? tour.tourId;
  if (stableId !== undefined && stableId !== null && String(stableId).trim()) {
    return String(stableId);
  }

  return index !== undefined ? `public-tour-${index}` : '';
};

const mapTourCardModel = ({
  title,
  destination,
  imageUrl,
  distanceKm,
  averageRating,
  reviewCount,
  duration,
}: {
  title: string;
  destination: string;
  imageUrl: string;
  distanceKm: number | null;
  averageRating: number | null;
  reviewCount: number;
  duration: unknown;
}): TourCardDisplayModel => ({
  title,
  location: destination,
  imageUrl,
  distanceText: formatTourDistance(distanceKm, distanceKm === null ? null : 'km'),
  ratingText: formatTourRating(averageRating, reviewCount),
  durationText: formatTourDuration(duration),
});

export const mapBackendPublicTour = (
  tour: BackendPublicTour,
  index = 0,
  routeLookup?: Map<number, TourRoute>,
  reviewSummary?: TourRatingSummary,
): PublicTourListItem => {
  const imageUrls = [
    ...toPublicTourStringArray(tour.imageUrls),
    ...toPublicTourStringArray(tour.thumbnailUrl),
    ...toPublicTourStringArray(tour.imageUrl),
    ...toPublicTourStringArray(tour.coverImageUrl),
  ];
  const destination =
    tour.destination ??
    tour.destinationName ??
    tour.meetingPoint ??
    tour.location ??
    tour.province ??
    TOUR_DISPLAY_TEXT.updatingLocation;
  const title = tour.title ?? tour.name ?? tour.tourName ?? TOUR_DISPLAY_TEXT.untitledTour;
  const routeId = toNullableInteger(tour.routeId);
  const route = routeId !== null ? routeLookup?.get(routeId) : undefined;
  const distanceKm = route ? toNullableNumber(route.distanceKm) : null;
  const normalizedReviewSummary = reviewSummary ?? { averageRating: null, reviewCount: 0 };
  const stableId = getPublicTourStableId(tour, index);

  const mappedTour: Tour = {
    id: stableId,
    title,
    description: tour.description ?? '',
    destination,
    province: tour.province ?? destination,
    imageUrls: imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGES.TOUR],
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    difficulty: normalizePublicTourDifficulty(tour.difficulty),
    distance: distanceKm ?? Number.NaN,
    duration:
      toNullableNumber(
        tour.duration ??
          (tour.estimatedDurationMin ? Number(tour.estimatedDurationMin) / 60 : undefined),
      ) ?? Number.NaN,
    elevation: Number.NaN,
    maxParticipants: toPublicTourNumber(tour.maxParticipants, 0),
    currentParticipants: toPublicTourNumber(tour.currentParticipants ?? tour.bookingsCount, 0),
    pricePerPerson: toPublicTourNumber(tour.pricePerPerson ?? tour.price, 0),
    currency: tour.currency ?? 'VND',
    rating: normalizedReviewSummary.averageRating ?? Number.NaN,
    reviewCount: normalizedReviewSummary.reviewCount,
    highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
    itinerary: Array.isArray(tour.itinerary) ? tour.itinerary : [],
    reviews: Array.isArray(tour.reviews) ? tour.reviews : [],
    guideId: String(tour.guideId ?? tour.providerId ?? tour.guide?.id ?? ''),
    guideName: tour.guideName ?? tour.providerName ?? tour.guide?.name ?? 'Chektrek Guide',
    guideAvatarUrl: tour.guideAvatarUrl ?? tour.guide?.avatarUrl,
    tags: toPublicTourStringArray(tour.tags),
    isFeatured: Boolean(tour.isFeatured),
    availableDates: toPublicTourStringArray(tour.availableDates),
    status: normalizePublicTourStatus(tour.status),
    createdAt: tour.createdAt ?? new Date().toISOString(),
  };

  return {
    tour: mappedTour,
    tourId: toNullableInteger(tour.tourId ?? tour.id),
    routeId,
    providerId: tour.providerId !== undefined ? String(tour.providerId) : undefined,
    rawStatus: tour.status !== undefined ? String(tour.status) : undefined,
    ratingSummary: normalizedReviewSummary,
    card: mapTourCardModel({
      title,
      destination,
      imageUrl: mappedTour.thumbnailUrl,
      distanceKm,
      averageRating: normalizedReviewSummary.averageRating,
      reviewCount: normalizedReviewSummary.reviewCount,
      duration:
        tour.duration ??
        (tour.estimatedDurationMin ? Number(tour.estimatedDurationMin) / 60 : undefined),
    }),
  };
};

export const mapBackendPublicTours = (
  items: unknown,
  routeLookup?: Map<number, TourRoute>,
  reviewSummaryLookup?: Map<string, TourRatingSummary>,
): PublicTourListItem[] => {
  const list = Array.isArray(items) ? items : [];
  const seenIds = new Set<string>();

  return list.reduce<PublicTourListItem[]>((acc, item, index) => {
    const backendTour = item as BackendPublicTour;
    const stableId = getPublicTourStableId(backendTour, index);
    const reviewSummary =
      stableId && reviewSummaryLookup ? reviewSummaryLookup.get(stableId) : undefined;
    const mappedTour = mapBackendPublicTour(backendTour, index, routeLookup, reviewSummary);
    if (!mappedTour.tour.id || seenIds.has(mappedTour.tour.id)) {
      return acc;
    }

    seenIds.add(mappedTour.tour.id);
    acc.push(mappedTour);
    return acc;
  }, []);
};

export const loadPublicTourCardModels = async (
  options: PublicTourLoaderOptions = {},
): Promise<PublicTourListItem[]> => {
  const { forceRefresh = false, limit = 50 } = options;
  const toursResponse = await toursApi.getAll({ limit });
  const tours = Array.isArray(toursResponse?.data) ? toursResponse.data : [];
  const routes = await getOrLoadRoutes(forceRefresh);
  const routeLookup = buildRouteLookup(routes);
  const tourIds = tours
    .map(tour => getPublicTourStableId(tour as Partial<Tour> & { tourId?: string | number }))
    .filter(Boolean);
  const reviewSummaryLookup = await loadReviewSummaries(tourIds, forceRefresh);

  return mapBackendPublicTours(tours, routeLookup, reviewSummaryLookup);
};

export const mapTourApiToCardModel = (
  tour: BackendPublicTour,
  index = 0,
  routeLookup?: Map<number, TourRoute>,
  reviewSummary?: TourRatingSummary,
): TourCardDisplayModel => mapBackendPublicTour(tour, index, routeLookup, reviewSummary).card;
