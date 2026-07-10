import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { usePostStore } from '@store/postStore';
import { ManagedPost, PostStatus } from '@/types';
import { PostManagementCard } from '../components/PostManagementCard';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const MOCK_POSTS: ManagedPost[] = [
  {
    id: 'p001',
    title: 'Kinh nghiệm trekking Fansipan tháng 3 - Mùa hoa đẹp nhất',
    content: 'Tháng 3 là thời điểm lý tưởng để chinh phục Fansipan khi hoa đỗ quyên nở rộ khắp sườn núi. Đường đi khá thử thách nhưng cảnh đẹp bù lại hoàn toàn...',
    coverImageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
    galleryImageUrls: [],
    tags: ['fansipan', 'trekking', 'sapa'],
    status: 'published',
    viewCount: 2847,
    likeCount: 194,
    commentCount: 43,
    authorId: 'u001',
    authorName: 'Nguyễn Văn Provider',
    createdAt: '2025-03-20',
    updatedAt: '2025-03-22',
  },
  {
    id: 'p002',
    title: 'Top 5 điểm trekking đẹp nhất Việt Nam bạn không thể bỏ qua',
    content: 'Việt Nam sở hữu nhiều cung đường trekking tuyệt vời từ Bắc chí Nam. Đây là top 5 điểm đến mà bất kỳ trekker nào cũng phải thử ít nhất một lần...',
    coverImageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
    galleryImageUrls: [],
    tags: ['top5', 'vietnam', 'trekking'],
    status: 'draft',
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    authorId: 'u001',
    authorName: 'Nguyễn Văn Provider',
    createdAt: '2025-06-01',
    updatedAt: '2025-06-03',
  },
  {
    id: 'p003',
    title: 'Đồ dùng cần thiết khi đi trekking dài ngày trong rừng',
    content: 'Chuẩn bị đồ đúng cách là yếu tố then chốt để có chuyến đi an toàn và thoải mái. Dưới đây là checklist đầy đủ mà tôi đã tích lũy qua nhiều chuyến đi...',
    coverImageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    galleryImageUrls: [],
    tags: ['gear', 'tips', 'trekking'],
    status: 'published',
    viewCount: 5213,
    likeCount: 387,
    commentCount: 89,
    authorId: 'u001',
    authorName: 'Nguyễn Văn Provider',
    createdAt: '2025-02-10',
    updatedAt: '2025-02-15',
  },
];

const FILTER_TABS: { label: string; value: PostStatus | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đã đăng', value: 'published' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Lưu trữ', value: 'archived' },
];

export const ManagePostsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { posts, filterStatus, searchQuery, setPosts, setFilterStatus, setSearchQuery, deletePost } = usePostStore();

  useEffect(() => {
    setPosts(MOCK_POSTS);
  }, []);

  const filtered = posts.filter(p => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Bài đăng</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreatePost', {})}
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
            placeholder="Tìm kiếm bài viết..."
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
            <Text style={[styles.filterTabText, filterStatus === tab.value && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Post List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing[4] }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={56} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>Không có bài viết nào</Text>
            <Text style={styles.emptySubtitle}>Tạo bài viết mới để chia sẻ</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostManagementCard
            post={item}
            onEdit={id => navigation.navigate('CreatePost', { postId: id })}
            onDelete={deletePost}
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('CreatePost', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.onPrimary} />
        <Text style={styles.fabText}>Bài viết mới</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.onSurface },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
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
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.onSurfaceVariant },
  filterTabTextActive: { color: Colors.onPrimary },
  listContent: { padding: Spacing[5], paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: Spacing[16], gap: Spacing[3] },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.onSurface },
  emptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.onSurfaceVariant },
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
  fabText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.onPrimary },
});

