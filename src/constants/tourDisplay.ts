export const TOUR_DISPLAY_TEXT = {
  discoverTitle: 'Khám phá',
  searchPlaceholder: 'Tìm kiếm tuyến đường, tour...',
  allCategories: 'Tất cả',
  easy: 'Dễ',
  moderate: 'Trung bình',
  hard: 'Khó',
  featuredTours: 'Tuyến nổi bật',
  seeAll: 'Xem tất cả',
  loadingTours: 'Đang tải tour...',
  noTours: 'Chưa có tour nào',
  noTourData: 'Chưa có dữ liệu tour',
  noMatchingTours: 'Hiện chưa có tour phù hợp để hiển thị.',
  retry: 'Thử lại',
  noDistance: 'Chưa có thông tin quãng đường',
  noRating: 'Chưa có đánh giá',
  singleReview: 'đánh giá',
  multipleReviewsLabel: 'đánh giá',
  untitledTour: 'Chuyến đi',
  updatingLocation: 'Đang cập nhật địa điểm',
  distance: 'Khoảng cách',
  elevation: 'Độ cao',
  viewDetails: 'Xem chi tiết',
  upcomingTrips: 'Chuyến đi sắp tới',
  nearbyDestinations: 'Điểm đến gần bạn',
  featureInProgress: 'Tính năng đang phát triển',
  nearbyDestinationMessage:
    'Điểm đến gần bạn sẽ được bổ sung khi dịch vụ gợi ý hoàn thiện.',
  upcomingTripsMessage:
    'Danh sách chuyến đi sắp tới sẽ hiển thị khi dữ liệu tracking được kết nối.',
} as const;

const viNumberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const formatTourDistance = (value: number | null, unit: 'm' | 'km' | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return TOUR_DISPLAY_TEXT.noDistance;
  }

  if (unit === 'm') {
    if (value < 1000) {
      return `${Math.round(value)} m`;
    }

    const kmValue = value / 1000;
    const formattedKm = Number.isInteger(kmValue) ? `${kmValue}` : viNumberFormatter.format(kmValue);
    return `${formattedKm} km`;
  }

  if (unit === 'km') {
    if (value < 1) {
      return `${Math.round(value * 1000)} m`;
    }

    const formattedKm = Number.isInteger(value) ? `${value}` : viNumberFormatter.format(value);
    return `${formattedKm} km`;
  }

  return TOUR_DISPLAY_TEXT.noDistance;
};

export const formatTourDuration = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '--';

    const numericDuration = Number(trimmedValue);
    if (Number.isFinite(numericDuration)) {
      return `${viNumberFormatter.format(numericDuration)} giờ`;
    }

    return trimmedValue;
  }

  if (value === null || value === undefined) return '--';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '--';
  return `${viNumberFormatter.format(numericValue)} giờ`;
};

export const formatTourRating = (
  rating: number | null,
  reviewCount?: number | null,
): string => {
  if (rating === null || !Number.isFinite(rating)) {
    return TOUR_DISPLAY_TEXT.noRating;
  }

  const normalizedReviewCount =
    reviewCount !== null && reviewCount !== undefined && Number.isFinite(reviewCount)
      ? Number(reviewCount)
      : 0;

  if (normalizedReviewCount <= 0) {
    return TOUR_DISPLAY_TEXT.noRating;
  }

  return `${viNumberFormatter.format(rating)} (${normalizedReviewCount} đánh giá)`;
};
