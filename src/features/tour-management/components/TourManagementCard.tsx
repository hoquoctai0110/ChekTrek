import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ManagedTour, ManagedTourStatus } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

const STATUS_CONFIG: Record<ManagedTourStatus, { label: string; color: string; bg: string }> = {
  published: { label: 'Đã đăng', color: Colors.successGreen, bg: Colors.successGreen + '18' },
  draft: { label: 'Nháp', color: Colors.warningAmber, bg: Colors.warningAmber + '18' },
  archived: { label: 'Lưu trữ', color: Colors.onSurfaceVariant, bg: Colors.surfaceContainer },
};

interface TourManagementCardProps {
  tour: ManagedTour;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPricingPolicy: (id: string) => void;
  onManageSchedules: (id: string, title: string) => void;
}

export const TourManagementCard: React.FC<TourManagementCardProps> = ({
  tour,
  onEdit,
  onDelete,
  onPricingPolicy,
  onManageSchedules,
}) => {
  const status = STATUS_CONFIG[tour.status];

  const handleDelete = () => {
    Alert.alert('Xóa tour', `Bạn có chắc muốn xóa tour "${tour.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => onDelete(tour.id) },
    ]);
  };

  return (
    <View style={styles.card}>
      {/* ── Image ── */}
      <Image source={{ uri: tour.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />

      {/* ── Status Badge ── */}
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {tour.title}
        </Text>
        <Text style={styles.destination}>
          <Ionicons name="location-outline" size={12} color={Colors.onSurfaceVariant} />{' '}
          {tour.destination}
        </Text>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={13} color={Colors.warningAmber} />
            <Text style={styles.statText}>{tour.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.statText}>{tour.bookingCount} đặt</Text>
          </View>
          <View style={styles.statDivider} />
          <Text style={styles.priceText}>{(tour.price / 1000).toFixed(0)}k đ/người</Text>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(tour.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onPricingPolicy(tour.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Giá & CS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onManageSchedules(tour.id, tour.title)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Lịch</Text>
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
  thumbnail: {
    width: '100%',
    height: 160,
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
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  info: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  destination: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.outlineVariant,
  },
  priceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primaryFixed + '30',
    borderRadius: Radius.lg,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  actionBtnDelete: {
    backgroundColor: Colors.errorContainer,
  },
});

