import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import {
  tourSchedulesApi,
  TourSchedule,
  TourScheduleStatus,
} from '@services/api/tourSchedules.api';

type RouteType = RouteProp<RootStackParamList, 'ManageSchedules'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<TourScheduleStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Đang mở', color: Colors.successGreen, bg: Colors.successGreen + '18' },
  draft: { label: 'Nháp', color: Colors.warningAmber, bg: Colors.warningAmber + '18' },
  cancelled: { label: 'Đã hủy', color: Colors.error, bg: Colors.errorContainer },
  completed: { label: 'Hoàn tất', color: Colors.onSurfaceVariant, bg: Colors.surfaceContainer },
};

const formatScheduleDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '--';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value?: number | null): string =>
  value === null || value === undefined ? '--' : `${value.toLocaleString('vi-VN')}đ`;

export const ManageSchedulesScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { tourId, tourTitle } = route.params;
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await tourSchedulesApi.getMine(tourId);
      setSchedules(data);
    } catch (error) {
      console.log('[ManageSchedules] failed to fetch schedules', error);
      setErrorMessage('Không thể tải lịch khởi hành. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [tourId]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  const handleDelete = (schedule: TourSchedule) => {
    Alert.alert('Hủy lịch khởi hành', 'Bạn có chắc muốn hủy/xóa lịch này không?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await tourSchedulesApi.delete(tourId, schedule.id);
            await loadSchedules();
          } catch (error) {
            console.log('[ManageSchedules] failed to delete schedule', error);
            Alert.alert('Lỗi', 'Không thể xóa lịch khởi hành. Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  const navigateToForm = (schedule?: TourSchedule) => {
    navigation.navigate('ScheduleForm', {
      tourId,
      tourTitle,
      scheduleId: schedule?.id,
      schedule,
    });
  };

  const renderSchedule = ({ item }: { item: TourSchedule }) => {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.active;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateText}>{formatScheduleDate(item.startDateTime)}</Text>
            <Text style={styles.dateText}>{formatScheduleDate(item.endDateTime)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Giá</Text>
            <Text style={styles.statValue}>{formatCurrency(item.price)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tối đa</Text>
            <Text style={styles.statValue}>{item.maxParticipants}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Đã đặt</Text>
            <Text style={styles.statValue}>{item.bookedCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Còn chỗ</Text>
            <Text style={styles.statValue}>{item.availableSlots}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToForm(item)}>
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải lịch khởi hành...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Không thể tải lịch</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSchedules}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        renderItem={renderSchedule}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Ionicons name="calendar-outline" size={56} color={Colors.outlineVariant} />
            <Text style={styles.stateTitle}>Chưa có lịch khởi hành</Text>
            <Text style={styles.stateText}>Thêm lịch để trekker có thể đặt tour.</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Lịch khởi hành</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {tourTitle}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigateToForm()}>
          <Ionicons name="add" size={22} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {renderContent()}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => navigateToForm()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color={Colors.onPrimary} />
        <Text style={styles.fabText}>Thêm lịch khởi hành</Text>
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
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    gap: Spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing[5],
    paddingBottom: 110,
  },
  separator: {
    height: Spacing[4],
  },
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    ...(Shadows.sm as object),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  dateBlock: {
    flex: 1,
    gap: 4,
  },
  dateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  statItem: {
    minWidth: '47%',
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: 2,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[2],
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
  actionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  deleteBtn: {
    backgroundColor: Colors.errorContainer,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    gap: Spacing[3],
  },
  stateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing[5],
    borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
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
