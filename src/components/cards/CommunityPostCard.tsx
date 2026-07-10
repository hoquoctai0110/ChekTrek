import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityPost } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: (post: CommunityPost) => void;
  onLike: (postId: string) => void;
  style?: ViewStyle;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onPress,
  onLike,
  style,
}) => {
  const timeAgo = format(new Date(post.createdAt), 'dd MMM', { locale: vi });

  return (
    <TouchableOpacity
      onPress={() => onPress(post)}
      activeOpacity={0.95}
      style={[styles.card, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{post.authorName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <View style={styles.metaRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{post.authorLevel}</Text>
              </View>
              <Text style={styles.time}>{timeAgo}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content} numberOfLines={3}>
        {post.content}
      </Text>

      {/* Images */}
      {post.imageUrls.length > 0 && (
        <View style={styles.imagesContainer}>
          {post.imageUrls.slice(0, 3).map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={[
                styles.postImage,
                post.imageUrls.length === 1 && styles.postImageFull,
                post.imageUrls.length === 2 && styles.postImageHalf,
                post.imageUrls.length >= 3 && styles.postImageThird,
              ]}
              resizeMode="cover"
            />
          ))}
          {post.imageUrls.length > 3 && (
            <View style={[styles.postImageThird, styles.moreImages]}>
              <Text style={styles.moreImagesText}>+{post.imageUrls.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Location */}
      {post.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={Colors.primary} />
          <Text style={styles.locationText}>{post.location}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike(post.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? Colors.dangerRed : Colors.onSurfaceVariant}
          />
          <Text style={[styles.actionText, post.isLiked && { color: Colors.dangerRed }]}>
            {post.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onPress(post)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.actionText}>{post.shareCount}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.card,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
    ...(Shadows.sm as object),
  },
  header: {},
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onPrimary,
  },
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.chip,
  },
  levelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.primary,
  },
  time: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  content: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 4,
    height: 180,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  postImage: {
    borderRadius: Radius.md,
  },
  postImageFull: {
    flex: 1,
    height: 180,
  },
  postImageHalf: {
    flex: 1,
    height: 180,
  },
  postImageThird: {
    flex: 1,
    height: 180,
  },
  moreImages: {
    backgroundColor: Colors.inverseSurface + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  moreImagesText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.surfaceWhite,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '30',
    paddingTop: Spacing[2],
    gap: Spacing[5],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
});

