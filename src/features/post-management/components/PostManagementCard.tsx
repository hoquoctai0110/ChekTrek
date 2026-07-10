import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ManagedPost, PostStatus } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string }> = {
  published: { label: 'Đã đăng', color: Colors.successGreen, bg: Colors.successGreen + '18' },
  draft: { label: 'Nháp', color: Colors.warningAmber, bg: Colors.warningAmber + '18' },
  archived: { label: 'Lưu trữ', color: Colors.onSurfaceVariant, bg: Colors.surfaceContainer },
};

interface PostManagementCardProps {
  post: ManagedPost;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PostManagementCard: React.FC<PostManagementCardProps> = ({
  post,
  onEdit,
  onDelete,
}) => {
  const status = STATUS_CONFIG[post.status];

  const handleDelete = () => {
    Alert.alert(
      'Xóa bài viết',
      `Bạn có chắc muốn xóa bài "${post.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => onDelete(post.id) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* ── Cover Image ── */}
      {post.coverImageUrl && (
        <Image
          source={{ uri: post.coverImageUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
      )}

      {/* ── Status Badge ── */}
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.excerpt} numberOfLines={2}>{post.content}</Text>

        {/* ── Tags ── */}
        {post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.slice(0, 3).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{post.viewCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{post.likeCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{post.commentCount}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(post.updatedAt).toLocaleDateString('vi-VN')}</Text>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(post.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelete]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...(Shadows.md as object),
  },
  cover: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.surfaceContainer,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing[3],
    right: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  info: { padding: Spacing[4], gap: Spacing[2] },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  excerpt: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[1] },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.chip,
  },
  tagText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.onSurfaceVariant },
  dateText: {
    fontFamily: FontFamily.regular, fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant, marginLeft: 'auto',
  },
  actions: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[1] },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primaryFixed + '30',
    borderRadius: Radius.lg,
  },
  actionBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary },
  actionBtnDelete: { backgroundColor: Colors.errorContainer, marginLeft: 'auto' },
});

