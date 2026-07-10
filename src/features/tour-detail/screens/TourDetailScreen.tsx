import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '@components/common/UserAvatar';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { RootStackParamList } from '@navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useSavedStore } from '@store/savedStore';
import { toursApi } from '@services/api/tours.api';
import { reviewsApi, TourReview, TourReviewSummary } from '@services/api/reviews.api';
import { PLACEHOLDER_IMAGES } from '@constants/index';
import { formatTourDistance, TOUR_DISPLAY_TEXT } from '@constants/tourDisplay';
import { getRouteDistanceKm, loadRouteById } from '@services/tours/publicTours';
import { Tour, TourDifficulty, TourStatus } from '../../../types';

type TourDetailRouteProp = RouteProp<RootStackParamList, 'TourDetail'>;
type TourDetailNavProp = NativeStackNavigationProp<RootStackParamList>;

type TourDetail = Omit<Tour, 'duration'> & {
  duration: string;
  routeId?: number;
};

type BackendTourDetail = Partial<Omit<Tour, 'duration'>> & {
  duration?: string | number | null;
  tourId?: string | number;
  routeId?: string | number | null;
  name?: string;
  tourName?: string;
  destinationName?: string;
  location?: string;
  meetingPoint?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  price?: number;
  distanceKm?: number;
  estimatedDurationMin?: number;
  averageRating?: number;
  ratingAverage?: number;
  reviewsCount?: number;
  bookingsCount?: number;
  providerId?: string | number;
  providerName?: string;
  route?: {
    distanceKm?: number;
    estimatedDurationMin?: number;
    elevationGain?: number;
  };
  guide?: {
    id?: string | number;
    name?: string;
    avatarUrl?: string;
  };
  provider?: {
    id?: string | number;
    name?: string;
    avatarUrl?: string;
  };
};

const normalizeDifficulty = (value: unknown): TourDifficulty => {
  const difficulty = String(value ?? 'Moderate').toLowerCase();
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'Hard';
  if (difficulty === 'extreme') return 'Extreme';
  return 'Moderate';
};

const normalizeStatus = (value: unknown): TourStatus => {
  const status = String(value ?? 'active').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'archived') return 'archived';
  return 'active';
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const formatDurationLabel = (duration: string): string => {
  const normalizedDuration = duration.trim();
  if (!normalizedDuration) return '--';

  const durationParts = normalizedDuration.match(/^(\d+)D(\d+)N$/i);
  if (!durationParts) return normalizedDuration;

  const [, days, nights] = durationParts;
  return nights === '0' ? `${days}N` : `${days}N${nights}Đ`;
};

const formatReviewDate = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const mapBackendTourDetail = (tour: BackendTourDetail): TourDetail => {
  const imageUrls = [
    ...toStringArray(tour.imageUrls),
    ...toStringArray(tour.thumbnailUrl),
    ...toStringArray(tour.imageUrl),
    ...toStringArray(tour.coverImageUrl),
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
    id: String(tour.id ?? tour.tourId ?? ''),
    routeId: Number.isFinite(Number(tour.routeId)) ? Number(tour.routeId) : undefined,
    title,
    description: tour.description ?? 'Chưa có mô tả cho tour này.',
    destination,
    province: tour.province ?? destination,
    imageUrls: imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGES.TOUR],
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    difficulty: normalizeDifficulty(tour.difficulty),
    distance:
      toNullableNumber(tour.distance ?? tour.distanceKm ?? tour.route?.distanceKm) ?? Number.NaN,
    duration: String(tour.duration ?? '').trim(),
    elevation: toNumber(tour.elevation ?? tour.route?.elevationGain),
    maxParticipants: toNumber(tour.maxParticipants),
    currentParticipants: toNumber(tour.currentParticipants ?? tour.bookingsCount),
    pricePerPerson: toNumber(tour.pricePerPerson ?? tour.price),
    currency: tour.currency ?? 'VND',
    rating: toNumber(tour.rating ?? tour.averageRating ?? tour.ratingAverage),
    reviewCount: toNumber(tour.reviewCount ?? tour.reviewsCount),
    highlights: toStringArray(tour.highlights),
    itinerary: tour.itinerary ?? [],
    reviews: [],
    guideId: String(tour.guideId ?? tour.providerId ?? tour.guide?.id ?? tour.provider?.id ?? ''),
    guideName:
      tour.guideName ??
      tour.providerName ??
      tour.guide?.name ??
      tour.provider?.name ??
      'Chektrek Provider',
    guideAvatarUrl: tour.guideAvatarUrl ?? tour.guide?.avatarUrl ?? tour.provider?.avatarUrl,
    tags: toStringArray(tour.tags),
    isFeatured: Boolean(tour.isFeatured),
    availableDates: toStringArray(tour.availableDates),
    status: normalizeStatus(tour.status),
    createdAt: tour.createdAt ?? new Date().toISOString(),
  };
};

export const TourDetailScreen: React.FC = () => {
  const route = useRoute<TourDetailRouteProp>();
  const navigation = useNavigation<TourDetailNavProp>();
  const insets = useSafeAreaInsets();
  const tourId = route.params.tourId;
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [reviews, setReviews] = useState<TourReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<TourReviewSummary>({
    averageRating: 0,
    reviewCount: 0,
  });
  const [areReviewsLoading, setAreReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null | undefined>(undefined);

  const isSaved = useSavedStore(state => state.savedTourIds.includes(tourId));
  const toggleSaved = useSavedStore(state => state.toggleSaved);
  const isDownloaded = useSavedStore(state => state.downloadedTourIds.includes(tourId));
  const toggleDownloaded = useSavedStore(state => state.toggleDownloaded);

  const fetchTour = useCallback(async () => {
    console.log('[TourDetail] tourId', tourId);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await toursApi.getById(tourId);
      console.log('[TourDetail] response', response);
      console.log('[TourDetail] raw API duration =', response.duration);
      const mappedTour = mapBackendTourDetail(response as unknown as BackendTourDetail);
      console.log('[TourDetail] mapped duration =', mappedTour.duration);
      setDistanceKm(
        Number.isFinite(mappedTour.distance)
          ? mappedTour.distance
          : mappedTour.routeId
            ? undefined
            : null,
      );
      setTour(mappedTour);
    } catch (error) {
      console.log('[TourDetail] failed to fetch tour', error);
      setTour(null);
      setErrorMessage('Không thể tải thông tin tour. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const fetchRouteDistance = useCallback(
    async (routeId?: number, options?: { forceRefresh?: boolean }) => {
      if (!routeId) {
        setDistanceKm(null);
        return;
      }

      setDistanceKm(undefined);

      try {
        const routeDetail = await loadRouteById(routeId, options?.forceRefresh);
        setDistanceKm(getRouteDistanceKm(routeDetail));
      } catch (error) {
        console.log('[TourDetail] failed to fetch route distance', error);
        setDistanceKm(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (!tour?.routeId) {
      setDistanceKm(tour ? null : undefined);
      return;
    }

    void fetchRouteDistance(tour.routeId);
  }, [fetchRouteDistance, tour?.routeId]);

  const fetchReviews = useCallback(async () => {
    setAreReviewsLoading(true);
    setReviewsError(null);

    try {
      const reviewList = await reviewsApi.getTourReviews(tourId);
      console.log('[TourDetail] reviews:', reviewList);
      setReviews(reviewList);

      try {
        const summary = await reviewsApi.getTourReviewSummary(tourId);
        setReviewSummary(summary);
      } catch (summaryError) {
        console.log('[TourDetail] review summary unavailable:', summaryError);
        setReviewSummary({
          averageRating:
            reviewList.length > 0
              ? reviewList.reduce((total, review) => total + review.rating, 0) / reviewList.length
              : 0,
          reviewCount: reviewList.length,
        });
      }
    } catch (error) {
      console.error('[TourDetail] failed to fetch reviews:', error);
      setReviews([]);
      setReviewSummary({ averageRating: 0, reviewCount: 0 });
      setReviewsError('Không thể tải đánh giá. Vui lòng thử lại.');
    } finally {
      setAreReviewsLoading(false);
    }
  }, [tourId]);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews]),
  );

  const getDifficultyLabel = (d: string) => {
    if (d === 'Easy') return 'Cơ bản';
    if (d === 'Moderate') return 'Trung bình';
    return 'Khó';
  };

  const renderState = (content: React.ReactNode) => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="stateBgGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E5F9CE" />
              <Stop offset="100%" stopColor="#A2EDB4" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#stateBgGrad)" />
        </Svg>
      </View>
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color="#0A2518" />
      </TouchableOpacity>
      <View style={styles.stateContainer}>{content}</View>
    </View>
  );

  if (isLoading) {
    return renderState(
      <>
        <ActivityIndicator size="large" color="#0A7A4A" />
        <Text style={styles.stateText}>Đang tải thông tin tour...</Text>
      </>,
    );
  }

  if (errorMessage) {
    return renderState(
      <>
        <Text style={styles.stateTitle}>Không thể tải tour</Text>
        <Text style={styles.stateText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTour} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Thu lai</Text>
        </TouchableOpacity>
      </>,
    );
  }

  if (!tour) {
    return renderState(
      <>
        <Text style={styles.stateTitle}>Không có dữ liệu tour</Text>
        <Text style={styles.stateText}>Tour này hiện chưa có thông tin để hiển thị.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTour} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </>,
    );
  }

  const formattedDuration = formatDurationLabel(tour.duration);
  const displayedDistance =
    distanceKm === undefined
      ? '--'
      : formatTourDistance(distanceKm, distanceKm === null ? null : 'km');
  const displayedRating = reviewSummary.averageRating;
  const displayedReviewCount = reviewSummary.reviewCount;
  const handleOpenRouteMap = () => {
    if (!tour.routeId) {
      Alert.alert('Chưa có lộ trình', 'Tour này hiện chưa có dữ liệu bản đồ lộ trình.');
      return;
    }

    navigation.navigate('RouteMap', { routeId: tour.routeId });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Gradient Background ── */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="bgGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E5F9CE" />
              <Stop offset="100%" stopColor="#A2EDB4" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: tour.imageUrls[0] ?? tour.thumbnailUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Subtle overlay */}
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#0A2518" />
          </TouchableOpacity>

          {/* Right action buttons: Map + Download + Wishlist */}
          <View style={[styles.rightBtns, { top: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleOpenRouteMap}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={20} color="#0A7A4A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() => toggleDownloaded(tour.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDownloaded ? 'cloud-done' : 'cloud-download-outline'}
                size={20}
                color={isDownloaded ? '#00F582' : '#0A2518'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() => toggleSaved(tour.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={isSaved ? '#FF4444' : '#0A2518'}
              />
            </TouchableOpacity>
          </View>

          {/* Tour name on image */}
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>{tour.title.toUpperCase()}</Text>
            <Text style={styles.heroElevation}>{tour.elevation}M</Text>
          </View>
        </View>

        {/* Stats chips */}
        <View style={styles.statsChips}>
          <View style={styles.chip}>
            <Ionicons name="layers-outline" size={14} color="#0A7A4A" />
            <Text style={styles.chipText}>{getDifficultyLabel(tour.difficulty)}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="walk-outline" size={14} color="#0A7A4A" />
            <Text style={styles.chipText}>{displayedDistance}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={14} color="#0A7A4A" />
            <Text style={styles.chipText}>{formattedDuration}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="star" size={13} color="#FFD700" />
            <Text style={styles.chipText}>{displayedRating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.tourTitle}>{tour.title}</Text>
          <Text style={styles.description}>{tour.description}</Text>

          {/* Guide */}
          <View style={styles.guideRow}>
            <UserAvatar
              name={tour.guideName}
              avatarUrl={tour.guideAvatarUrl}
              size={44}
              showBorder
            />
            <View style={styles.guideInfo}>
              <Text style={styles.guideName}>{tour.guideName}</Text>
              <Text style={styles.guideRole}>Tour Provider</Text>
            </View>
            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={18} color="#0A7A4A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>Đánh giá ({displayedReviewCount})</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{displayedRating.toFixed(1)}</Text>
            </View>
          </View>

          {reviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <UserAvatar name={review.userName} avatarUrl={review.userAvatarUrl} size={38} />
                <View style={styles.reviewAuthor}>
                  <Text style={styles.reviewName}>{review.userName}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons
                        key={s}
                        name="star"
                        size={11}
                        color={s <= review.rating ? '#FFD700' : 'rgba(10,37,24,0.2)'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}

          {areReviewsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : reviewsError ? (
            <View style={styles.reviewsErrorContainer}>
              <Text style={styles.noReview}>{reviewsError}</Text>
              <TouchableOpacity onPress={fetchReviews} style={styles.reviewsRetryButton}>
                <Text style={styles.reviewsRetryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : reviews.length === 0 ? (
            <Text style={styles.noReview}>Chưa có đánh giá nào.</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerPriceLabel}>Giá từ</Text>
          <Text style={styles.footerPrice}>{tour.pricePerPerson.toLocaleString('vi-VN')} VNĐ</Text>
          <Text style={styles.footerPerPerson}>/ người</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Booking', { tourId: tour.id })}
          activeOpacity={0.85}
        >
          {/* Gradient button */}
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Defs>
                <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#00F582" />
                  <Stop offset="100%" stopColor="#E3F53C" />
                </SvgLinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#btnGrad)" rx={24} ry={24} />
            </Svg>
          </View>
          <Text style={styles.bookBtnText}>Thanh toán</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},
  stateContainer: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  stateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing[5],
    borderRadius: 22,
    backgroundColor: '#E3F53C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroContainer: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E3F53C',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  rightBtns: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  heroActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#FFFFFF',
    letterSpacing: 1.5,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroElevation: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#E3F53C',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Stats chips ───────────────────────────────────────────────────────────
  statsChips: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.12)',
  },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },

  // ── Content Card ──────────────────────────────────────────────────────────
  contentCard: {
    marginHorizontal: Spacing[4],
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tourTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
    lineHeight: 28,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.7)',
    lineHeight: 22,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(10,37,24,0.08)',
  },
  guideInfo: {
    flex: 1,
    gap: 2,
  },
  guideName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: '#0A2518',
  },
  guideRole: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: '#0A7A4A',
  },
  contactBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,200,83,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,122,74,0.2)',
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviewsSection: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  reviewsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.08)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  reviewAuthor: {
    flex: 1,
    gap: 3,
  },
  reviewName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.45)',
  },
  reviewComment: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.75)',
    lineHeight: 20,
  },
  noReview: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.4)',
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },
  reviewsErrorContainer: { alignItems: 'center' },
  reviewsRetryButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  reviewsRetryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    backgroundColor: 'rgba(229,249,206,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(10,37,24,0.1)',
  },
  footerLeft: {
    gap: 1,
  },
  footerPriceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.6)',
  },
  footerPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  footerPerPerson: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.6)',
  },
  bookBtn: {
    height: 50,
    paddingHorizontal: Spacing[7],
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#00F582',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
    zIndex: 1,
  },
});
