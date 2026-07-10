import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { useTourManagementStore } from '@store/tourManagementStore';
import { ManagedTour, ManagedTourStatus, Tour } from '@/types';
import { toursApi } from '@services/api/tours.api';
import { TourManagementCard } from '../components/TourManagementCard';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data
const MOCK_MANAGED_TOURS: ManagedTour[] = [
  {
    id: 'mt001',
    title: 'Trekking Fansipan - Nóc nhà Đông Dương',
    destination: 'Sa Pa, Lào Cai',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
    status: 'published',
    price: 2850000,
    bookingCount: 47,
    rating: 4.8,
    createdAt: '2025-01-10',
    updatedAt: '2025-06-01',
  },
  {
    id: 'mt002',
    title: 'Trekking Tây Côn Lĩnh 2 ngày 1 đêm',
    destination: 'Hà Giang',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
    status: 'published',
    price: 1750000,
    bookingCount: 23,
    rating: 4.6,
    createdAt: '2025-02-15',
    updatedAt: '2025-05-28',
  },
  {
    id: 'mt003',
    title: 'Vượt đỉnh Pu Ta Leng - Chinh phục đỉnh cao',
    destination: 'Lai Châu',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=400',
    status: 'draft',
    price: 3200000,
    bookingCount: 0,
    rating: 0,
    createdAt: '2025-06-01',
    updatedAt: '2025-06-03',
  },
  {
    id: 'mt004',
    title: 'Khám phá rừng nguyên sinh Xuân Thủy',
    destination: 'Nam Định',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
    status: 'archived',
    price: 980000,
    bookingCount: 12,
    rating: 4.3,
    createdAt: '2024-11-05',
    updatedAt: '2025-04-10',
  },
];

void MOCK_MANAGED_TOURS;

const FILTER_TABS: { label: string; value: ManagedTourStatus | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đã đăng', value: 'published' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Lưu trữ', value: 'archived' },
];

type ProviderTour = Partial<Tour> & {
  _id?: string;
  price?: number;
  bookingCount?: number;
  updatedAt?: string;
  imageUrl?: string;
};

const mapTourToManagedTour = (tour: ProviderTour): ManagedTour => ({
  id: tour.id ?? tour._id ?? '',
  title: tour.title ?? '',
  destination: tour.destination ?? '',
  thumbnailUrl: tour.thumbnailUrl ?? tour.imageUrl ?? tour.imageUrls?.[0] ?? '',
  status:
    tour.status === 'active' ? 'published' : tour.status === 'archived' ? 'archived' : 'draft',
  price: tour.price ?? tour.pricePerPerson ?? 0,
  bookingCount: tour.bookingCount ?? tour.currentParticipants ?? 0,
  rating: tour.rating ?? 0,
  createdAt: tour.createdAt ?? '',
  updatedAt: tour.updatedAt ?? tour.createdAt ?? '',
});

export const ManageToursScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const {
    managedTours,
    filterStatus,
    searchQuery,
    setManagedTours,
    setFilterStatus,
    setSearchQuery,
  } = useTourManagementStore();

  const loadMyTours = useCallback(async () => {
    try {
      const tours = await toursApi.getMyTours();
      setManagedTours(tours.map(mapTourToManagedTour));
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách tour. Vui lòng thử lại.');
    }
  }, [setManagedTours]);

  useEffect(() => {
    loadMyTours();
  }, [loadMyTours]);

  const handleDeleteTour = async (tourId: string) => {
    try {
      await toursApi.deleteMyTour(tourId);
      await loadMyTours();
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa tour. Vui lòng thử lại.');
    }
  };

  const filtered = managedTours.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Tour</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateTour', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm tour..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.filterTab, filterStatus === tab.value && styles.filterTabActive]}
            onPress={() => setFilterStatus(tab.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === tab.value && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tour List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={56} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>Không có tour nào</Text>
            <Text style={styles.emptySubtitle}>Tạo tour mới để bắt đầu</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TourManagementCard
            tour={item}
            onEdit={id => navigation.navigate('CreateTour', { tourId: id })}
            onDelete={handleDeleteTour}
            onPricingPolicy={id => navigation.navigate('PricingPolicy', { tourId: id })}
            onManageSchedules={(id, title) =>
              navigation.navigate('ManageSchedules', { tourId: id, tourTitle: title })
            }
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('CreateTour', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.onPrimary} />
        <Text style={styles.fabText}>Tạo tour mới</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  filterTab: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.chip,
    backgroundColor: Colors.surfaceContainer,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  filterTabTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    padding: Spacing[5],
    paddingBottom: 100,
  },
  separator: {
    height: Spacing[4],
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing[16],
    gap: Spacing[3],
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: Spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
});

