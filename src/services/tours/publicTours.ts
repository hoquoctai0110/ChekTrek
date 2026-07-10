import { PLACEHOLDER_IMAGES } from '@constants/index';
import { Tour, TourDifficulty, TourStatus } from '@/types';

export type BackendPublicTour = Partial<Tour> & {
  tourId?: string | number;
  name?: string;
  tourName?: string;
  destinationName?: string;
  location?: string;
  meetingPoint?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  price?: number | string | null;
  distanceKm?: number | string | null;
  estimatedDurationMin?: number | string | null;
  averageRating?: number | string | null;
  ratingAverage?: number | string | null;
  reviewsCount?: number | string | null;
  bookingsCount?: number | string | null;
  providerId?: string | number;
  providerName?: string;
  guide?: {
    id?: string | number;
    name?: string;
    avatarUrl?: string;
  };
  route?: {
    distanceKm?: number | string | null;
    elevationGain?: number | string | null;
  };
};

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

export const toPublicTourStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
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

export const mapBackendPublicTour = (tour: BackendPublicTour, index = 0): Tour => {
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
    'Chektrek';
  const title = tour.title ?? tour.name ?? tour.tourName ?? 'Untitled tour';

  return {
    id: getPublicTourStableId(tour, index),
    title,
    description: tour.description ?? '',
    destination,
    province: tour.province ?? destination,
    imageUrls: imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGES.TOUR],
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    difficulty: normalizePublicTourDifficulty(tour.difficulty),
    distance: toPublicTourNumber(tour.distance ?? tour.distanceKm ?? tour.route?.distanceKm, 0),
    duration: toPublicTourNumber(
      tour.duration ??
        (tour.estimatedDurationMin ? Number(tour.estimatedDurationMin) / 60 : undefined),
      0,
    ),
    elevation: toPublicTourNumber(tour.elevation ?? tour.route?.elevationGain, 0),
    maxParticipants: toPublicTourNumber(tour.maxParticipants, 0),
    currentParticipants: toPublicTourNumber(tour.currentParticipants ?? tour.bookingsCount, 0),
    pricePerPerson: toPublicTourNumber(tour.pricePerPerson ?? tour.price, 0),
    currency: tour.currency ?? 'VND',
    rating: toPublicTourNumber(tour.rating ?? tour.averageRating ?? tour.ratingAverage, 0),
    reviewCount: toPublicTourNumber(tour.reviewCount ?? tour.reviewsCount, 0),
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
};

export const mapBackendPublicTours = (items: unknown): Tour[] => {
  const list = Array.isArray(items) ? items : [];
  const seenIds = new Set<string>();

  return list.reduce<Tour[]>((acc, item, index) => {
    const mappedTour = mapBackendPublicTour(item as BackendPublicTour, index);
    if (!mappedTour.id || seenIds.has(mappedTour.id)) {
      return acc;
    }

    seenIds.add(mappedTour.id);
    acc.push(mappedTour);
    return acc;
  }, []);
};
