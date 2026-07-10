import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { PublicTourListItem } from '@services/tours/publicTours';
import { TOUR_DISPLAY_TEXT } from '@constants/tourDisplay';

interface DiscoverTourCardProps {
  item: PublicTourListItem;
  onPress: (item: PublicTourListItem) => void;
}

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return 'Liên hệ';
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
};

const extractShortRating = (ratingText: string): string => {
  if (ratingText === TOUR_DISPLAY_TEXT.noRating) return ratingText;
  const [value] = ratingText.split(' ');
  return value || ratingText;
};

const getDifficultyLabel = (difficulty: PublicTourListItem['tour']['difficulty']): string => {
  if (difficulty === 'Easy') return 'Dễ';
  if (difficulty === 'Moderate') return 'Trung bình';
  if (difficulty === 'Hard') return 'Khó';
  return 'Rất khó';
};

export const DiscoverTourCard: React.FC<DiscoverTourCardProps> = ({ item, onPress }) => {
  const [isLiked, setIsLiked] = useState(false);
  const { tour, card, ratingSummary } = item;
  const ratingValue = useMemo(() => extractShortRating(card.ratingText), [card.ratingText]);

  return (
    <View style={styles.tourCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: card.imageUrl }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => setIsLiked(previousValue => !previousValue)}
          activeOpacity={0.8}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color="#0A2518" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {tour.guideName || card.location}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.statText}>{ratingValue}</Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <View style={styles.statItem}>
            <View style={styles.difficultyDot} />
            <Text style={styles.statText}>{getDifficultyLabel(tour.difficulty)}</Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{card.distanceText}</Text>

          <Text style={styles.dot}>•</Text>

          <Text style={styles.statText}>{card.durationText}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.reviewText}>{card.ratingText}</Text>
          <Text style={styles.priceText}>{formatPrice(tour.pricePerPerson)}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(item)}
          activeOpacity={0.8}
          accessibilityLabel={TOUR_DISPLAY_TEXT.viewDetails}
        >
          <Text style={styles.detailBtnText}>{TOUR_DISPLAY_TEXT.viewDetails}</Text>
          {ratingSummary.reviewCount > 0 ? (
            <Text style={styles.detailBtnMeta}>
              {ratingSummary.reviewCount}{' '}
              {ratingSummary.reviewCount === 1
                ? TOUR_DISPLAY_TEXT.singleReview
                : TOUR_DISPLAY_TEXT.multipleReviewsLabel}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tourCard: {
    width: '100%',
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing[2],
  },
  reviewText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(10, 37, 24, 0.7)',
    flex: 1,
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A7A4A',
  },
  detailBtn: {
    backgroundColor: '#00F582',
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
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
  detailBtnMeta: {
    marginTop: 2,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(10, 37, 24, 0.7)',
  },
});
