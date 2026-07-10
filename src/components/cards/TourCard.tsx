import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Tour, TourDifficulty } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { DIFFICULTY_CONFIG } from '@constants/index';

interface TourCardProps {
  tour: Tour;
  onPress: (tour: Tour) => void;
  style?: ViewStyle;
  compact?: boolean;
}

export const TourCard: React.FC<TourCardProps> = ({ tour, onPress, style, compact = false }) => {
  const difficulty = DIFFICULTY_CONFIG[tour.difficulty as TourDifficulty];
  const safeRating = Number.isFinite(Number(tour.rating)) ? Number(tour.rating) : 0;
  const safeDistance = Number.isFinite(Number(tour.distance)) ? Number(tour.distance) : 0;
  const safeDuration = Number.isFinite(Number(tour.duration)) ? Number(tour.duration) : 0;
  const safeTitle = tour.title || 'Chuyến đi';
  const safeDestination = tour.destination || 'Đang cập nhật địa điểm';
  const thumbnailSource =
    typeof tour.thumbnailUrl === 'string' && tour.thumbnailUrl.trim()
      ? { uri: tour.thumbnailUrl }
      : undefined;

  return (
    <TouchableOpacity
      onPress={() => onPress(tour)}
      activeOpacity={0.9}
      style={[styles.card, compact && styles.cardCompact, style]}
    >
      {/* Image */}
      <View style={[styles.imageContainer, compact && styles.imageContainerCompact]}>
        {thumbnailSource ? (
          <Image source={thumbnailSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="image-outline" size={28} color={Colors.onSurfaceVariant} />
          </View>
        )}
        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={Colors.warningAmber} />
          <Text style={styles.ratingText}>{safeRating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {safeTitle}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={Colors.onSurfaceVariant} />
          <Text style={styles.location} numberOfLines={1}>
            {safeDestination}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <MaterialIcons name="straighten" size={12} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{safeDistance} km</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{safeDuration}h</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: difficulty?.bgColor ?? '#f0f0f0' },
            ]}
          >
            <Text style={[styles.difficultyText, { color: difficulty?.color ?? Colors.secondary }]}>
              {difficulty?.label ?? tour.difficulty}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onPress(tour)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
    ...(Shadows.card as object),
  },
  cardCompact: {
    width: '100%',
    flexDirection: 'row',
    height: 100,
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  imageContainerCompact: {
    width: 100,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurface,
  },
  content: {
    padding: Spacing[3],
    gap: Spacing[1],
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  location: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[1],
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  difficultyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

