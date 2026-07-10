import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { CommunityPostCard } from '@components/cards/CommunityPostCard';
import { CategoryChip } from '@components/common/CategoryChip';
import { EmptyState } from '@components/common/EmptyState';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { MOCK_POSTS } from '@utils/mockData';
import { CommunityPost } from '@/types';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

const FEED_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'following', label: 'Đang theo dõi' },
  { id: 'popular', label: 'Phổ biến' },
];

export const CommunityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [refreshing, setRefreshing] = useState(false);

  const handleLike = (postId: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    );
  };

  const handlePostPress = (post: CommunityPost) => {
    // Navigate to post detail (future)
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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
        <Text style={styles.headerTitle}>Cộng đồng</Text>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={22} color="#0A2518" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FEED_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterTab, selectedFilter === f.id && styles.filterTabActive]}
            onPress={() => setSelectedFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.filterTabText, selectedFilter === f.id && styles.filterTabTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CommunityPostCard
            post={item}
            onPress={handlePostPress}
            onLike={handleLike}
            style={styles.postCard}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName="people-outline"
            title="Chưa có bài viết"
            message="Hãy là người đầu tiên chia sẻ trải nghiệm!"
          />
        }
      />

      {/* Create Post FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost' as never)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#0A2518',
  },
  searchBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.08)',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    gap: Spacing[1],
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  filterTabActive: {
    backgroundColor: '#0F291E',
  },
  filterTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semiBold,
  },
  list: {
    padding: Spacing[4],
    paddingBottom: 100,
    gap: Spacing[3],
  },
  postCard: {},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F291E',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.lg as object),
  },
});

