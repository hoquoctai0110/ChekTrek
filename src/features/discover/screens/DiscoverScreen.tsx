import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { SearchBar } from '@components/common/SearchBar';
import { CategoryChip } from '@components/common/CategoryChip';
import { EmptyState } from '@components/common/EmptyState';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Tour } from '@/types';
import { RootStackParamList } from '@navigation/types';
import { toursApi } from '@services/api/tours.api';
import {
  getPublicTourStableId,
  mapBackendPublicTours,
  toPublicTourNumber,
} from '@services/tours/publicTours';
import { usePublicTourFeedStore } from '@store/publicTourFeedStore';

type DiscoverNavProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');

const FILTER_CATEGORIES = [
  { id: '', label: 'Tat ca' },
  { id: 'Easy', label: 'De' },
  { id: 'Moderate', label: 'Trung binh' },
  { id: 'Hard', label: 'Kho' },
];

const formatDurationLabel = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '--';

    const numericDuration = Number(trimmedValue);
    if (Number.isFinite(numericDuration)) return `${numericDuration} gio`;
    return trimmedValue;
  }

  const numericDuration = toPublicTourNumber(value, 0);
  return numericDuration > 0 ? `${numericDuration} gio` : '--';
};

const getDifficultyLabel = (difficulty: Tour['difficulty']): string => {
  if (difficulty === 'Easy') return 'De';
  if (difficulty === 'Moderate') return 'Trung binh';
  return 'Kho';
};

const DiscoverTourCard: React.FC<{
  tour: Tour;
  onPress: (tour: Tour) => void;
}> = ({ tour, onPress }) => {
  const [isLiked, setIsLiked] = useState(false);
  const ratingValue = toPublicTourNumber(tour.rating ?? 0, 0);
  const distanceValue = toPublicTourNumber(tour.distance ?? 0, 0);
  const durationLabel = formatDurationLabel(tour.duration);
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
            <Text style={styles.statText}>{getDifficultyLabel(tour.difficulty)}</Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{distanceValue}km</Text>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{durationLabel}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(tour)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailBtnText}>Chi tiet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverNavProp>();
  const publicTourFeedVersion = usePublicTourFeedStore(state => state.version);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTours = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await toursApi.getAll({ limit: 50 });
      const items = Array.isArray(response?.data) ? response.data : [];
      setTours(mapBackendPublicTours(items));
    } catch {
      setTours([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTours({ showLoading: tours.length === 0 });
    }, [loadTours, publicTourFeedVersion, tours.length]),
  );

  const filteredTours = useMemo(
    () =>
      tours.filter(tour => {
        const normalizedSearch = search.trim().toLowerCase();
        const title = tour.title?.toLowerCase() ?? '';
        const destination = tour.destination?.toLowerCase() ?? '';
        const matchSearch =
          !normalizedSearch ||
          title.includes(normalizedSearch) ||
          destination.includes(normalizedSearch);
        const matchFilter = !selectedFilter || tour.difficulty === selectedFilter;
        return matchSearch && matchFilter;
      }),
    [search, selectedFilter, tours],
  );

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadTours();
  }, [loadTours]);

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
        <Text style={styles.headerTitle}>Kham pha</Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.75}
        >
          <Ionicons name="notifications-outline" size={24} color="#0A2518" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tim kiem tuyen duong" />
      </View>

      <View style={styles.filtersWrapper}>
        <FlatList
          data={FILTER_CATEGORIES}
          keyExtractor={item => item.id || 'all'}
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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0A2518" />
        }
      >
        <View style={styles.quickCardsRow}>
          <View style={styles.quickCard}>
            <MaterialCommunityIcons name="crown-outline" size={26} color="#0A2518" />
            <Text style={styles.quickCardText}>Tong tour: {tours.length}</Text>
          </View>
          <View style={styles.quickCard}>
            <Ionicons name="map-outline" size={24} color="#0A2518" />
            <Text style={styles.quickCardText}>Ket qua: {filteredTours.length}</Text>
          </View>
        </View>

        <View style={styles.toursContainer}>
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredTours.length > 0 ? (
            filteredTours.map((tour, index) => (
              <DiscoverTourCard
                key={getPublicTourStableId(tour, index)}
                tour={tour}
                onPress={handleTourPress}
              />
            ))
          ) : (
            <EmptyState
              title="Chua co du lieu tour"
              message="Hien chua co tour phu hop de hien thi."
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
