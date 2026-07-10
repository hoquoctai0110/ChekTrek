import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@components/buttons/PrimaryButton';
import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import {
  tourSchedulesApi,
  TourScheduleStatus,
  UpsertTourSchedulePayload,
} from '@services/api/tourSchedules.api';

type RouteType = RouteProp<RootStackParamList, 'ScheduleForm'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

const STATUS_OPTIONS: { label: string; value: TourScheduleStatus }[] = [
  { label: 'Đang mở', value: 'active' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Đã hủy', value: 'cancelled' },
  { label: 'Hoàn tất', value: 'completed' },
];

const toInputDateTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (numberValue: number) => String(numberValue).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const toApiDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

export const ScheduleFormScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { tourId, tourTitle, schedule } = route.params;
  const isEditing = Boolean(route.params.scheduleId);
  const [startDateTime, setStartDateTime] = useState(toInputDateTime(schedule?.startDateTime));
  const [endDateTime, setEndDateTime] = useState(toInputDateTime(schedule?.endDateTime));
  const [maxParticipants, setMaxParticipants] = useState(
    schedule?.maxParticipants ? String(schedule.maxParticipants) : '',
  );
  const [price, setPrice] = useState(
    schedule?.price !== null && schedule?.price !== undefined ? String(schedule.price) : '',
  );
  const [status, setStatus] = useState<TourScheduleStatus>(schedule?.status ?? 'active');
  const [isSaving, setIsSaving] = useState(false);

  const validationError = useMemo(() => {
    if (!startDateTime.trim()) return 'Vui lòng nhập thời gian bắt đầu.';
    if (!endDateTime.trim()) return 'Vui lòng nhập thời gian kết thúc.';

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (Number.isNaN(start.getTime())) return 'Thời gian bắt đầu không hợp lệ.';
    if (Number.isNaN(end.getTime())) return 'Thời gian kết thúc không hợp lệ.';
    if (end <= start) return 'Thời gian kết thúc phải sau thời gian bắt đầu.';

    const max = Number(maxParticipants);
    if (!Number.isFinite(max) || max <= 0) return 'Số người tối đa phải lớn hơn 0.';

    if (price.trim()) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return 'Giá phải lớn hơn hoặc bằng 0.';
    }

    return null;
  }, [endDateTime, maxParticipants, price, startDateTime]);

  const handleSubmit = async () => {
    if (validationError) {
      Alert.alert('Thông tin chưa hợp lệ', validationError);
      return;
    }

    const payload: UpsertTourSchedulePayload = {
      startDateTime: toApiDateTime(startDateTime),
      endDateTime: toApiDateTime(endDateTime),
      maxParticipants: Number(maxParticipants),
      status,
    };

    if (price.trim()) payload.price = Number(price);

    setIsSaving(true);
    try {
      if (isEditing && route.params.scheduleId) {
        await tourSchedulesApi.update(tourId, route.params.scheduleId, payload);
      } else {
        await tourSchedulesApi.create(tourId, payload);
      }
      navigation.goBack();
    } catch (error) {
      console.log('[ScheduleForm] failed to save schedule', error);
      Alert.alert('Lỗi', 'Không thể lưu lịch khởi hành. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isEditing ? 'Sửa lịch' : 'Thêm lịch khởi hành'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {tourTitle}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Bắt đầu</Text>
          <TextInput
            value={startDateTime}
            onChangeText={setStartDateTime}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={Colors.outline}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Kết thúc</Text>
          <TextInput
            value={endDateTime}
            onChangeText={setEndDateTime}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor={Colors.outline}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Số người tối đa</Text>
          <TextInput
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="12"
            placeholderTextColor={Colors.outline}
            style={styles.input}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Giá riêng cho lịch này</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Để trống để dùng giá tour"
            placeholderTextColor={Colors.outline}
            style={styles.input}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Trạng thái</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.statusChip, status === option.value && styles.statusChipActive]}
                onPress={() => setStatus(option.value)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    status === option.value && styles.statusChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton
          title={isEditing ? 'Lưu thay đổi' : 'Tạo lịch'}
          onPress={handleSubmit}
          isLoading={isSaving}
          disabled={Boolean(validationError)}
          style={styles.submitBtn}
        />
      </View>
    </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing[5],
  },
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '60',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  statusChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.chip,
    backgroundColor: Colors.surfaceContainer,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
  },
  statusChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  statusChipTextActive: {
    color: Colors.onPrimary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '30',
  },
  submitBtn: {
    width: '100%',
  },
});
