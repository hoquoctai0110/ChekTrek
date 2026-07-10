import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip, TripStatus } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TripCardProps {
  trip: Trip;
  onPress: (trip: Trip) => void;
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; bg: string }> = {
  planned: { label: 'Đã lên kế hoạch', color: Colors.primary, bg: Colors.primaryFixed },
  active: { label: 'Đang diễn ra', color: Colors.successGreen, bg: '#D1FAE5' },
  completed: { label: 'Hoàn thành', color: Colors.onSurfaceVariant, bg: Colors.surfaceContainer },
  cancelled: { label: 'Đã hủy', color: Colors.dangerRed, bg: '#FEE2E2' },
};

export const TripCard: React.FC<TripCardProps> = ({ trip, onPress, style }) => {
  const status = STATUS_CONFIG[trip.status];
  const formattedDate = format(new Date(trip.startDate), 'dd MMM yyyy', { locale: vi });

  return (
    <TouchableOpacity
      onPress={() => onPress(trip)}
      activeOpacity={0.88}
      style={[styles.card, style]}
    >
      {trip.coverImageUrl && (
        <Image source={{ uri: trip.coverImageUrl }} style={styles.cover} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {trip.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{trip.participants.length} thành viên</Text>
          </View>
        </View>

        {/* Participant avatars */}
        <View style={styles.avatarRow}>
          {trip.participants.slice(0, 4).map((p, i) => (
            <View key={p.userId} style={[styles.avatarContainer, { marginLeft: i > 0 ? -8 : 0 }]}>
              {p.avatarUrl ? (
                <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          ))}
          {trip.participants.length > 4 && (
            <View style={[styles.avatarContainer, styles.moreAvatars, { marginLeft: -8 }]}>
              <Text style={styles.moreText}>+{trip.participants.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
    ...(Shadows.card as object),
  },
  cover: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing[4],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.onPrimary,
  },
  moreAvatars: {
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.onSurfaceVariant,
  },
});

