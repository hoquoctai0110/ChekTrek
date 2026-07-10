import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { UserAvatar } from '@components/common/UserAvatar';
import { PrimaryButton } from '@components/buttons/PrimaryButton';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { MOCK_TRIPS } from '@utils/mockData';
import { RootStackParamList } from '@navigation/types';
import { Checkpoint } from '@/types';

type TripDetailRouteProp = RouteProp<RootStackParamList, 'TripDetail'>;
type TripDetailNavProp = NativeStackNavigationProp<RootStackParamList>;

export const TripDetailScreen: React.FC = () => {
  const route = useRoute<TripDetailRouteProp>();
  const navigation = useNavigation<TripDetailNavProp>();
  const trip = MOCK_TRIPS.find(t => t.id === route.params.tripId) ?? MOCK_TRIPS[0];

  const checkpointTypeConfig: Record<string, { icon: string; color: string }> = {
    start: { icon: 'flag', color: Colors.successGreen },
    waypoint: { icon: 'navigate', color: Colors.primary },
    rest: { icon: 'cafe', color: Colors.warningAmber },
    summit: { icon: 'trophy', color: Colors.warningAmber },
    end: { icon: 'checkmark-circle', color: Colors.successGreen },
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{trip.title}</Text>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('TripMap', { tripId: trip.id })}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        {trip.coverImageUrl && (
          <Image source={{ uri: trip.coverImageUrl }} style={styles.cover} resizeMode="cover" />
        )}

        {/* Trip Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {trip.status === 'planned' ? '📅 Đã lên kế hoạch' : trip.status === 'active' ? '🟢 Đang diễn ra' : '✅ Hoàn thành'}
              </Text>
            </View>
          </View>
          <View style={styles.tripMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.metaText}>{trip.startDate}</Text>
            </View>
            {trip.totalDistance && (
              <View style={styles.metaItem}>
                <Ionicons name="walk" size={16} color={Colors.successGreen} />
                <Text style={styles.metaText}>{trip.totalDistance} km</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weather */}
        {trip.weatherInfo && (
          <View style={styles.weatherCard}>
            <Text style={styles.cardTitle}>Thời Tiết</Text>
            <View style={styles.weatherContent}>
              <Text style={styles.weatherTemp}>{trip.weatherInfo.temperature}°C</Text>
              <View style={styles.weatherDetails}>
                <Text style={styles.weatherCondition}>{trip.weatherInfo.condition}</Text>
                <View style={styles.weatherStats}>
                  <View style={styles.weatherStat}>
                    <Ionicons name="water-outline" size={14} color={Colors.primary} />
                    <Text style={styles.weatherStatText}>{trip.weatherInfo.humidity}%</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Ionicons name="speedometer-outline" size={14} color={Colors.primary} />
                    <Text style={styles.weatherStatText}>{trip.weatherInfo.windSpeed} km/h</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Checkpoints Timeline */}
        {trip.checkpoints.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lịch Trình Điểm Dừng</Text>
            <View style={styles.timeline}>
              {trip.checkpoints.map((cp: Checkpoint, i: number) => {
                const cpConfig = checkpointTypeConfig[cp.type] ?? checkpointTypeConfig.waypoint;
                return (
                  <View key={cp.id} style={styles.timelineItem}>
                    {/* Line */}
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineIcon,
                          { backgroundColor: cp.isReached ? cpConfig.color : Colors.surfaceContainer },
                        ]}
                      >
                        <Ionicons
                          name={cpConfig.icon as never}
                          size={16}
                          color={cp.isReached ? Colors.surfaceWhite : Colors.outline}
                        />
                      </View>
                      {i < trip.checkpoints.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: cp.isReached ? cpConfig.color : Colors.outlineVariant + '40' },
                          ]}
                        />
                      )}
                    </View>
                    {/* Content */}
                    <View style={styles.timelineContent}>
                      <Text style={[styles.cpName, !cp.isReached && { color: Colors.onSurfaceVariant }]}>
                        {cp.name}
                      </Text>
                      {cp.description && (
                        <Text style={styles.cpDesc}>{cp.description}</Text>
                      )}
                      {cp.reachedAt && (
                        <Text style={styles.cpTime}>{cp.reachedAt}</Text>
                      )}
                    </View>
                    {cp.isReached && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.successGreen} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Group Members */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thành Viên ({trip.participants.length})</Text>
          <View style={styles.memberList}>
            {trip.participants.map(member => (
              <View key={member.userId} style={styles.memberItem}>
                <UserAvatar name={member.name} avatarUrl={member.avatarUrl} size={44} showBorder />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={[
                    styles.memberRole,
                    { color: member.role === 'leader' ? Colors.warningAmber : Colors.onSurfaceVariant }
                  ]}>
                    {member.role === 'leader' ? '👑 Trưởng đoàn' : 'Thành viên'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {trip.notes ? (
          <View style={[styles.card, styles.lastCard]}>
            <Text style={styles.cardTitle}>Ghi Chú</Text>
            <Text style={styles.notes}>{trip.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Actions */}
      {trip.status === 'active' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => navigation.navigate('SOS')}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={20} color={Colors.surfaceWhite} />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
          <PrimaryButton
            title="Xem Bản Đồ"
            onPress={() => navigation.navigate('TripMap', { tripId: trip.id })}
            style={styles.mapButton}
          />
        </View>
      )}
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '20',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  cover: {
    width: '100%',
    height: 200,
  },
  infoCard: {
    margin: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    ...(Shadows.sm as object),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: Spacing[5],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  weatherCard: {
    marginHorizontal: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    ...(Shadows.md as object),
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    marginBottom: Spacing[3],
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  weatherTemp: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['5xl'],
    color: Colors.onPrimary,
  },
  weatherDetails: {
    gap: Spacing[1],
  },
  weatherCondition: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  weatherStats: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherStatText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onPrimary + 'CC',
  },
  card: {
    marginHorizontal: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    ...(Shadows.sm as object),
  },
  lastCard: {
    marginBottom: Spacing[6],
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingBottom: Spacing[3],
  },
  timelineLeft: {
    alignItems: 'center',
    width: 36,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 6,
    gap: 3,
  },
  cpName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  cpDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  cpTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.successGreen,
  },
  memberList: {
    gap: Spacing[3],
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  memberRole: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  notes: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing[3],
    padding: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '20',
    ...(Shadows.navbar as object),
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.button,
    backgroundColor: Colors.sosRed,
  },
  sosText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.surfaceWhite,
    letterSpacing: 1,
  },
  mapButton: {
    flex: 1,
  },
});

