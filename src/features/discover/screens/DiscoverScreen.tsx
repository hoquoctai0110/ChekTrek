import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
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
import { TourCard } from '@components/cards/TourCard';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { RootStackParamList } from '@navigation/types';
import { loadPublicTourCardModels, PublicTourListItem } from '@services/tours/publicTours';
import { usePublicTourFeedStore } from '@store/publicTourFeedStore';
import { TOUR_DISPLAY_TEXT } from '@constants/tourDisplay';

type DiscoverNavProp = NativeStackNavigationProp<RootStackParamList>;

const FILTER_CATEGORIES = [
  { id: '', label: TOUR_DISPLAY_TEXT.allCategories },
  { id: 'Easy', label: TOUR_DISPLAY_TEXT.easy },
  { id: 'Moderate', label: TOUR_DISPLAY_TEXT.moderate },
  { id: 'Hard', label: TOUR_DISPLAY_TEXT.hard },
];

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverNavProp>();
  const publicTourFeedVersion = usePublicTourFeedStore(state => state.version);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [tours, setTours] = useState<PublicTourListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTours = useCallback(async ({ showLoading = false, forceRefresh = false } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const items = await loadPublicTourCardModels({ forceRefresh, limit: 50 });
      setTours(items);
    } catch {
      setTours([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTours({
        showLoading: tours.length === 0,
        forceRefresh: publicTourFeedVersion > 0,
      });
    }, [loadTours, publicTourFeedVersion, tours.length]),
  );

  const filteredTours = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tours.filter(item => {
      const { tour } = item;
      const title = tour.title?.toLowerCase() ?? '';
      const destination = tour.destination?.toLowerCase() ?? '';
      const matchSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        destination.includes(normalizedSearch);
      const matchFilter = !selectedFilter || tour.difficulty === selectedFilter;

      return matchSearch && matchFilter;
    });
  }, [search, selectedFilter, tours]);

  const handleTourPress = (tour: PublicTourListItem['tour']) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadTours({ forceRefresh: true });
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
        <Text style={styles.headerTitle}>{TOUR_DISPLAY_TEXT.discoverTitle}</Text>
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
          placeholder={TOUR_DISPLAY_TEXT.searchPlaceholder}
        />
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
            <Text style={styles.quickCardText}>Tổng tour: {tours.length}</Text>
          </View>
          <View style={styles.quickCard}>
            <Ionicons name="map-outline" size={24} color="#0A2518" />
            <Text style={styles.quickCardText}>Kết quả: {filteredTours.length}</Text>
          </View>
        </View>

        <View style={styles.toursContainer}>
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredTours.length > 0 ? (
            filteredTours.map(item => (
              <TourCard
                key={item.tour.id}
                tour={item.tour}
                display={item.card}
                onPress={handleTourPress}
                style={styles.tourCard}
              />
            ))
          ) : (
            <EmptyState
              title={TOUR_DISPLAY_TEXT.noTourData}
              message={TOUR_DISPLAY_TEXT.noMatchingTours}
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
    width: '100%',
  },
});
