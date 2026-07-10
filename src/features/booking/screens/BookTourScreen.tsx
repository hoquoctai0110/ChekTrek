import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { SearchBar } from '@components/common/SearchBar';
import { CategoryChip } from '@components/common/CategoryChip';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { RootStackParamList } from '@navigation/types';
import { Tour, TourDifficulty, TourStatus } from '../../../types';
import { useSavedStore } from '@store/savedStore';
import { toursApi } from '@services/api/tours.api';
import { PLACEHOLDER_IMAGES } from '@constants/index';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type DifficultyFilter = '' | TourDifficulty;

const FILTER_CATEGORIES: { id: DifficultyFilter; label: string }[] = [
  { id: '', label: 'Tất cả' },
  { id: 'Easy', label: 'Dễ' },
  { id: 'Moderate', label: 'Trung Bình' },
  { id: 'Hard', label: 'Khó' },
  { id: 'Extreme', label: 'Cực khó' },
];

type BackendTour = Partial<Tour> & {
  tourId?: string | number;
  name?: string;
  tourName?: string;
  destinationName?: string;
  meetingPoint?: string;
  location?: string;
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
  guide?: { id?: string | number; name?: string; avatarUrl?: string };
};

const normalizeDifficulty = (value: unknown): TourDifficulty => {
  const difficulty = String(value ?? 'Moderate').trim().toLowerCase();
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'Hard';
  if (difficulty === 'expert' || difficulty === 'extreme') return 'Extreme';
  return 'Moderate';
};

const normalizeStatus = (value: unknown): TourStatus => {
  const status = String(value ?? 'active').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'archived') return 'archived';
  return 'active';
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const mapBackendTour = (tour: BackendTour): Tour => {
  const imageUrls = [
    ...toStringArray(tour.imageUrls),
    ...toStringArray(tour.thumbnailUrl),
    ...toStringArray(tour.imageUrl),
    ...toStringArray(tour.coverImageUrl),
  ];
  const destination =
    tour.destination ?? tour.destinationName ?? tour.meetingPoint ?? tour.location ?? tour.province ?? 'Chektrek';
  const title = tour.title ?? tour.name ?? tour.tourName ?? 'Tour chưa có tên';

  return {
    id: String(tour.id ?? tour.tourId ?? `${title}-${destination}`),
    title,
    description: tour.description ?? '',
    destination,
    province: tour.province ?? destination,
    imageUrls: imageUrls.length ? imageUrls : [PLACEHOLDER_IMAGES.TOUR],
    thumbnailUrl: imageUrls[0] ?? PLACEHOLDER_IMAGES.TOUR,
    difficulty: normalizeDifficulty(tour.difficulty),
    distance: toNumber(tour.distance ?? tour.distanceKm),
    duration: toNumber(tour.duration ?? (tour.estimatedDurationMin ? Number(tour.estimatedDurationMin) / 60 : 0)),
    elevation: toNumber(tour.elevation),
    maxParticipants: toNumber(tour.maxParticipants),
    currentParticipants: toNumber(tour.currentParticipants ?? tour.bookingsCount),
    pricePerPerson: toNumber(tour.pricePerPerson ?? tour.price),
    currency: tour.currency ?? 'VND',
    rating: toNumber(tour.rating ?? tour.averageRating ?? tour.ratingAverage),
    reviewCount: toNumber(tour.reviewCount ?? tour.reviewsCount),
    highlights: toStringArray(tour.highlights),
    itinerary: tour.itinerary ?? [],
    reviews: tour.reviews ?? [],
    guideId: String(tour.guideId ?? tour.providerId ?? tour.guide?.id ?? ''),
    guideName: tour.guideName ?? tour.providerName ?? tour.guide?.name ?? 'Chektrek Guide',
    guideAvatarUrl: tour.guideAvatarUrl ?? tour.guide?.avatarUrl,
    tags: toStringArray(tour.tags),
    isFeatured: Boolean(tour.isFeatured),
    availableDates: toStringArray(tour.availableDates),
    status: normalizeStatus(tour.status),
    createdAt: tour.createdAt ?? new Date().toISOString(),
  };
};

const BookTourCard: React.FC<{ tour: Tour; onPress: (tour: Tour) => void }> = ({ tour, onPress }) => {
  const isSaved = useSavedStore(state => state.savedTourIds.includes(tour.id));
  const toggleSaved = useSavedStore(state => state.toggleSaved);
  const isDownloaded = useSavedStore(state => state.downloadedTourIds.includes(tour.id));
  const toggleDownloaded = useSavedStore(state => state.toggleDownloaded);

  return (
    <View style={styles.tourCard}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />
        
        {/* Download Button */}
        <TouchableOpacity
          style={[styles.downloadBtn, isDownloaded && { backgroundColor: '#00F582' }]}
          onPress={() => toggleDownloaded(tour.id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isDownloaded ? 'cloud-done' : 'cloud-download-outline'}
            size={18}
            color="#0A2518"
          />
        </TouchableOpacity>

        {/* Heart Button */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => toggleSaved(tour.id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={20}
            color="#0A2518"
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{tour.title}</Text>
        <Text style={styles.cardSubtitle}>{tour.destination}</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={13} color="#FFD700" />
            <Text style={styles.statText}>{tour.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <View style={styles.statItem}>
            <View style={styles.difficultyDot} />
            <Text style={styles.statText}>
              {tour.difficulty === 'Easy' ? 'Cơ bản' : tour.difficulty === 'Moderate' ? 'Trung bình' : 'Khó'}
            </Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.statText}>{tour.distance} km</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.statText}>{tour.duration}N{tour.duration - 1}Đ</Text>
        </View>

        {/* Detail Button */}
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

export const BookTourScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('');
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTours = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await toursApi.getAll({ limit: 100 });
      setTours(response.data.map(tour => mapBackendTour(tour as unknown as BackendTour)));
    } catch (error) {
      console.log('[BookTour] failed to fetch tours:', error);
      setErrorMessage('Không thể tải danh sách tour. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTours({ showLoading: true });
  }, [fetchTours]);

  const filteredTours = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tours.filter(tour => {
      const matchesSearch =
        !query ||
        tour.title.toLowerCase().includes(query) ||
        tour.destination.toLowerCase().includes(query);
      const matchesDifficulty =
        !selectedDifficulty || normalizeDifficulty(tour.difficulty) === selectedDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [search, selectedDifficulty, tours]);

  console.log('[BookTour] selected difficulty:', selectedDifficulty);
  console.log('[BookTour] filtered tour count:', filteredTours.length);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTours().finally(() => setIsRefreshing(false));
  }, [fetchTours]);

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
  };

  return (
    <SafeScreen backgroundColor="transparent">
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đặt tour</Text>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => navigation.navigate('AIChat')}
          activeOpacity={0.8}
        >
          <Text style={styles.aiBtnEmoji}>🤖</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm tour"
        />
      </View>

      {/* Difficulty filter chips — matches DiscoverScreen */}
      <View style={styles.filtersWrapper}>
        <FlatList
          data={FILTER_CATEGORIES}
          keyExtractor={item => item.id || 'all'}
          renderItem={({ item }) => (
            <CategoryChip
              label={item.label}
              isSelected={selectedDifficulty === item.id}
              onPress={() => setSelectedDifficulty(item.id)}
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Quick Cards */}
        <View style={styles.quickCardsRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('TrekkPass')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="crown-outline" size={26} color="#0A2518" />
            <Text style={styles.quickCardText}>FREEMIUM</Text>
            <Text style={styles.quickCardSub}>Nâng cấp gói</Text>
          </TouchableOpacity>
          <View style={styles.quickCard}>
            <Ionicons name="map-outline" size={24} color="#0A2518" />
            <Text style={styles.quickCardText}>{tours.length} Tours</Text>
          </View>
        </View>

        {/* Tour List */}
        <View style={styles.toursContainer}>
          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.stateText}>Đang tải danh sách tour...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateTitle}>Không thể tải tour</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchTours({ showLoading: true })}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTours.length === 0 ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateTitle}>Không tìm thấy tour</Text>
              <Text style={styles.stateText}>Hãy thử từ khóa hoặc độ khó khác.</Text>
            </View>
          ) : (
            filteredTours.map(tour => (
              <BookTourCard key={tour.id} tour={tour} onPress={handleTourPress} />
            ))
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
  aiBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  aiBtnEmoji: {
    fontSize: 22,
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
  quickCardSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#0A7A4A',
    marginTop: 1,
  },
  toursContainer: {
    gap: Spacing[5],
  },
  stateContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  stateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10, 37, 24, 0.65)',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#00F582',
    borderRadius: Radius.button,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  tourCard: {
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
  downloadBtn: {
    position: 'absolute',
    top: 12,
    right: 54,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.08)',
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
  },
  detailBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
});
