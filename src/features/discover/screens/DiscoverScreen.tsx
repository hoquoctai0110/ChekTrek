import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { SearchBar } from '@components/common/SearchBar';
import { CategoryChip } from '@components/common/CategoryChip';
import { EmptyState } from '@components/common/EmptyState';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { PLACEHOLDER_IMAGES } from '@constants/index';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Tour, TourDifficulty, TourStatus } from '@/types';
import { RootStackParamList } from '@navigation/types';
import { toursApi } from '@services/api/tours.api';

type DiscoverNavProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');

const FILTER_CATEGORIES = [
  { id: 'Easy', label: 'Dễ' },
  { id: 'Moderate', label: 'Trung Bình' },
  { id: 'Hard', label: 'Khó' },
];

type BackendDiscoverTour = Partial<Tour> & {
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
  route?: {
    distanceKm?: number | string | null;
    elevationGain?: number | string | null;
  };
  providerId?: string | number;
  providerName?: string;
  guide?: {
    id?: string | number;
    name?: string;
    avatarUrl?: string;
  };
};

type DiscoverTour = Tour & {
  distanceLabel: string;
  durationLabel: string;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value ?? fallback);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
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

const formatDurationLabel = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '--';

    const numericDuration = Number(trimmedValue);
    if (Number.isFinite(numericDuration)) return `${numericDuration} giá»`;
    return trimmedValue;
  }

  const numericDuration = toNumber(value, 0);
  return numericDuration > 0 ? `${numericDuration} giá»` : '--';
};

const getDiscoverTourKey = (
  tour: Partial<Tour> & { tourId?: string | number },
  index: number,
): string => {
  const stableId = tour.id ?? tour.tourId;
  if (stableId !== undefined && stableId !== null && String(stableId).trim()) {
    return String(stableId);
  }

  return `discover-tour-${index}`;
};

const mapBackendTourToDiscoverTour = (tour: BackendDiscoverTour): DiscoverTour => {
  const imageUrls = [
    ...toStringArray(tour.imageUrls),
    ...toStringArray(tour.thumbnailUrl),
    ...toStringArray(tour.imageUrl),
    ...toStringArray(tour.coverImageUrl),
  ];
  const title = tour.title ?? tour.name ?? tour.tourName ?? 'Untitled tour';
  const destination =
    tour.destination ??
    tour.destinationName ??
    tour.meetingPoint ??
    tour.location ??
    tour.province ??
    '--';
  const distanceValue = toNumber(tour.distance ?? tour.distanceKm ?? tour.route?.distanceKm, 0);
  const durationValue = toNumber(
    tour.duration ??
      (tour.estimatedDurationMin ? Number(tour.estimatedDurationMin) / 60 : undefined),
    0,
  );
  const durationLabel = formatDurationLabel(tour.duration);

  return {
    id: String(tour.id ?? tour.tourId ?? ''),
    title,
    description: tour.description ?? '',
    destination,
    province: tour.province ?? destination,
    imageUrls: imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGES.TOUR],
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    difficulty: normalizeDifficulty(tour.difficulty),
    distance: distanceValue,
    duration: durationValue,
    elevation: toNumber(tour.elevation ?? tour.route?.elevationGain, 0),
    maxParticipants: toNumber(tour.maxParticipants, 0),
    currentParticipants: toNumber(tour.currentParticipants ?? tour.bookingsCount, 0),
    pricePerPerson: toNumber(tour.pricePerPerson ?? tour.price, 0),
    currency: tour.currency ?? 'VND',
    rating: toNumber(tour.rating ?? tour.averageRating ?? tour.ratingAverage, 0),
    reviewCount: toNumber(tour.reviewCount ?? tour.reviewsCount, 0),
    highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
    itinerary: Array.isArray(tour.itinerary) ? tour.itinerary : [],
    reviews: Array.isArray(tour.reviews) ? tour.reviews : [],
    guideId: String(tour.guideId ?? tour.providerId ?? tour.guide?.id ?? ''),
    guideName: tour.guideName ?? tour.providerName ?? tour.guide?.name ?? 'Chektrek Guide',
    guideAvatarUrl: tour.guideAvatarUrl ?? tour.guide?.avatarUrl,
    tags: toStringArray(tour.tags),
    isFeatured: Boolean(tour.isFeatured),
    availableDates: toStringArray(tour.availableDates),
    status: normalizeStatus(tour.status),
    createdAt: tour.createdAt ?? new Date().toISOString(),
    distanceLabel: `${distanceValue}km`,
    durationLabel,
  };
};

const DiscoverTourCard: React.FC<{
  tour: DiscoverTour;
  onPress: (tour: DiscoverTour) => void;
}> = ({ tour, onPress }) => {
  const [isLiked, setIsLiked] = useState(false);
  const safeRating = Number(tour.rating ?? 0);
  const ratingValue = Number.isFinite(safeRating) ? safeRating : 0;
  const title = tour.title || 'Untitled tour';
  const destination = tour.destination || '--';

  return (
    <View style={styles.tourCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => setIsLiked(!isLiked)}
          activeOpacity={0.8}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color="#0A2518" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{destination}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.statText}>{Number(ratingValue ?? 0).toFixed(1)}</Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <View style={styles.statItem}>
            <View style={styles.difficultyDot} />
            <Text style={styles.statText}>
              {tour.difficulty === 'Easy'
                ? 'Dễ'
                : tour.difficulty === 'Moderate'
                  ? 'Trung bình'
                  : 'Khó'}
            </Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{tour.distanceLabel}</Text>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{tour.durationLabel}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(tour)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailBtnText}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverNavProp>();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Easy');
  const [tours, setTours] = useState<DiscoverTour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTours = async () => {
      try {
        const response = await toursApi.getAll({ limit: 50 });
        const items = Array.isArray(response?.data) ? response.data : [];

        if (isMounted) {
          setTours(items.map(tour => mapBackendTourToDiscoverTour(tour as BackendDiscoverTour)));
        }
      } catch {
        if (isMounted) {
          setTours([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTours();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTours = useMemo(
    () =>
      tours.filter(tour => {
        const normalizedSearch = search.toLowerCase();
        const title = tour.title?.toLowerCase() ?? '';
        const destination = tour.destination?.toLowerCase() ?? '';
        const matchSearch =
          !search || title.includes(normalizedSearch) || destination.includes(normalizedSearch);
        const matchFilter = !selectedFilter || tour.difficulty === selectedFilter;
        return matchSearch && matchFilter;
      }),
    [search, selectedFilter, tours],
  );

  const handleTourPress = (tour: DiscoverTour) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
  };

  return (
    <SafeScreen backgroundColor="transparent">
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Khám phá</Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.75}
        >
          <Ionicons name="notifications-outline" size={24} color="#0A2518" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm tuyến đường"
        />
      </View>

      <View style={styles.filtersWrapper}>
        <FlatList
          data={FILTER_CATEGORIES}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CategoryChip
              label={item.label}
              isSelected={selectedFilter === item.id}
              onPress={() => setSelectedFilter(item.id)}
              style={styles.chip}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickCardsRow}>
          <View style={styles.quickCard}>
            <MaterialCommunityIcons name="crown-outline" size={26} color="#0A2518" />
            <Text style={styles.quickCardText}>Tổng tour: {tours.length}</Text>
          </View>
          <View style={styles.quickCard}>
            <Ionicons name="map-outline" size={24} color="#0A2518" />
            <Text style={styles.quickCardText}>Khám phá: {filteredTours.length}</Text>
          </View>
        </View>

        <View style={styles.toursContainer}>
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredTours.length > 0 ? (
            filteredTours.map((tour, index) => (
              <DiscoverTourCard
                key={getDiscoverTourKey(tour, index)}
                tour={tour}
                onPress={handleTourPress}
              />
            ))
          ) : (
            <EmptyState
              title="Chưa có dữ liệu tour"
              message="Hiện chưa có tour phù hợp để hiển thị."
            />
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: '#0A2518',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.08)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchWrapper: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
  },
  filtersWrapper: {
    paddingVertical: Spacing[2],
  },
  filterList: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  chip: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing[5],
    gap: Spacing[5],
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: Spacing[4],
    width: '100%',
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.05)',
  },
  quickCardText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: '#0A2518',
    letterSpacing: 0.5,
  },
  toursContainer: {
    gap: Spacing[5],
    minHeight: 180,
  },
  tourCard: {
    width: width - Spacing[10],
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.05)',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00F582',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
  },
  cardContent: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10, 37, 24, 0.6)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginVertical: Spacing[1],
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F582',
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },
  dot: {
    color: 'rgba(10, 37, 24, 0.4)',
    fontSize: FontSize.xs,
  },
  detailBtn: {
    backgroundColor: '#00F582',
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[2],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
});
