import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { toursApi } from '@services/api/tours.api';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CreateTour'>;

const getApiErrorDetails = (error: unknown) => {
  const maybeError = error as {
    message?: string;
    response?: {
      status?: number;
      data?: unknown;
    };
    config?: {
      method?: string;
      url?: string;
      data?: unknown;
    };
  };

  return {
    message: maybeError.message,
    status: maybeError.response?.status,
    data: maybeError.response?.data,
    method: maybeError.config?.method,
    url: maybeError.config?.url,
    requestBody: maybeError.config?.data,
  };
};

interface FormSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  isOpen: boolean;
}

export const CreateTourScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const isEditing = !!route.params?.tourId;
  const selectedRouteId = route.params?.routeId;
  const selectedRouteName = route.params?.routeName;
  const selectedRoutePoints = route.params?.routePoints;

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('[CreateTourScreen] selectedRouteId:', selectedRouteId);
  }, [selectedRouteId]);

  // Form state
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Hard' | 'Extreme'>('Moderate');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('');
  const [highlights, setHighlights] = useState('');

  // Collapsible sections
  const [sections, setSections] = useState<Record<string, boolean>>({
    basic: true,
    route: true,
    schedule: false,
    images: false,
  });

  const toggleSection = (key: string) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openRouteMap = () => {
    console.log('[CreateTourScreen] create route button pressed');
    navigation.navigate('CreateRouteMap', {
      tourId: route.params?.tourId,
      routeId: selectedRouteId,
      routeName: selectedRouteName,
      points: selectedRoutePoints,
      difficulty,
    });
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên tour');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập điểm đến');
      return;
    }
    if (!selectedRouteId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tạo lộ trình trước khi đăng tour.');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        routeId: selectedRouteId,
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        maxParticipants: Number(maxParticipants) || 0,
        difficulty,
        duration: Number(duration) || 0,
        meetingPoint: destination.trim(),
        startDate: '',
        endDate: '',
      };
      console.log('[CreateTourScreen] final tour payload before POST /tours/me:', payload);
      if (isEditing && route.params?.tourId) {
        await toursApi.updateMyTour(route.params.tourId, payload);
      } else {
        await toursApi.createMyTour(payload);
      }
      navigation.navigate('ManageTours');
    } catch (error) {
      const errorDetails = getApiErrorDetails(error);
      console.log('[CreateTourScreen] createMyTour failed full error response:', errorDetails);
      Alert.alert(
        'Error',
        `Could not save tour.\n\nStatus: ${
          errorDetails.status ?? 'unknown'
        }\nResponse: ${JSON.stringify(errorDetails.data ?? errorDetails.message ?? 'unknown')}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Extreme'] as const;
  const DIFFICULTY_COLORS = {
    Easy: Colors.difficultyEasy,
    Moderate: Colors.difficultyModerate,
    Hard: Colors.difficultyHard,
    Extreme: Colors.difficultyExtreme,
  };
  const DIFFICULTY_LABELS = {
    Easy: 'Dễ', Moderate: 'Trung bình', Hard: 'Khó', Extreme: 'Cực khó',
  };

  console.log('[CreateTourScreen] route map button rendered');

  const SectionHeader = ({ label, icon, sectionKey }: { label: string; icon: keyof typeof Ionicons.glyphMap; sectionKey: string }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{label}</Text>
      </View>
      <Ionicons
        name={sections[sectionKey] ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={Colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Chỉnh sửa Tour' : 'Tạo Tour mới'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Form ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Basic Info ── */}
        <View style={styles.section}>
          <SectionHeader label="Thông tin cơ bản" icon="information-circle-outline" sectionKey="basic" />
          {sections.basic && (
            <View style={styles.sectionContent}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tên tour *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Trekking Fansipan 3 ngày"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Điểm đến *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Sa Pa, Lào Cai"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={destination}
                  onChangeText={setDestination}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả chi tiết về tour..."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Độ khó</Text>
                <View style={styles.difficultyRow}>
                  {DIFFICULTIES.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.difficultyChip,
                        difficulty === d && { backgroundColor: DIFFICULTY_COLORS[d] + '20', borderColor: DIFFICULTY_COLORS[d] },
                      ]}
                      onPress={() => setDifficulty(d)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.difficultyChipText,
                          difficulty === d && { color: DIFFICULTY_COLORS[d], fontFamily: FontFamily.bold },
                        ]}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Route Info ── */}
        <View style={styles.section}>
          <SectionHeader label="Thông tin lộ trình" icon="map-outline" sectionKey="route" />
          {sections.route && (
            <View style={styles.sectionContent}>
              <View style={styles.selectedRouteBox}>
                <View style={styles.selectedRouteHeader}>
                  <View style={styles.routeIconBox}>
                    <Ionicons name="git-branch-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.selectedRouteTextCol}>
                    <Text style={styles.fieldLabel}>Lộ trình</Text>
                    <Text style={styles.routeValue}>
                      {selectedRouteId
                        ? `Đã chọn lộ trình: #${selectedRouteId}`
                        : 'Chưa chọn lộ trình'}
                    </Text>
                    {selectedRouteName ? (
                      <Text style={styles.routeNameText}>{selectedRouteName}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.routeActionRow}>
                  <TouchableOpacity
                    style={styles.routeActionBtn}
                    onPress={openRouteMap}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.routeActionBtnText}>Tạo lộ trình trên bản đồ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.routeActionBtn,
                      styles.routeActionBtnSecondary,
                      !selectedRouteId && styles.routeActionBtnDisabled,
                    ]}
                    onPress={openRouteMap}
                    activeOpacity={0.8}
                    disabled={!selectedRouteId}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={selectedRouteId ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.routeActionBtnText,
                        styles.routeActionBtnTextSecondary,
                        !selectedRouteId && styles.routeActionBtnTextDisabled,
                      ]}
                    >
                      Sửa lộ trình
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Khoảng cách (km)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 12"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Thời gian (giờ)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 8"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Số người tối đa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 15"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={maxParticipants}
                  onChangeText={setMaxParticipants}
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.mapRouteBtn}
                onPress={openRouteMap}
                activeOpacity={0.85}
                testID="create-route-map-button"
                accessibilityLabel="Tạo lộ trình trên bản đồ"
              >
                <Ionicons name="map-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.mapRouteBtnText}>
                  {'T\u1ea1o l\u1ed9 tr\u00ecnh tr\u00ean b\u1ea3n \u0111\u1ed3'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Pricing ── */}
        <View style={styles.section}>
          <SectionHeader label="Giá & Ưu đãi" icon="pricetag-outline" sectionKey="schedule" />
          {sections.schedule && (
            <View style={styles.sectionContent}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Giá/người (VNĐ)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 2850000"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.pricingPolicyBtn}
                onPress={() => Alert.alert('Thông báo', 'Lưu tour trước để cài đặt chính sách giá')}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={16} color={Colors.primary} />
                <Text style={styles.pricingPolicyBtnText}>Thiết lập chính sách giá chi tiết</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Highlights ── */}
        <View style={styles.section}>
          <SectionHeader label="Điểm nổi bật" icon="star-outline" sectionKey="images" />
          {sections.images && (
            <View style={styles.sectionContent}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Điểm nổi bật (mỗi dòng 1 điểm)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={"VD:\nNgắm bình minh từ đỉnh núi\nTrải nghiệm văn hóa bản địa\n..."}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={highlights}
                  onChangeText={setHighlights}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Actions ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.draftBtn, (!selectedRouteId || isLoading) && styles.actionDisabled]}
          onPress={() => handleSave('draft')}
          activeOpacity={0.8}
          disabled={isLoading || !selectedRouteId}
        >
          <Ionicons name="save-outline" size={18} color={Colors.primary} />
          <Text style={styles.draftBtnText}>Lưu nháp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishBtn, (isLoading || !selectedRouteId) && styles.publishBtnDisabled]}
          onPress={() => handleSave('published')}
          activeOpacity={0.85}
          disabled={isLoading || !selectedRouteId}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={Colors.onPrimary} />
          <Text style={styles.publishBtnText}>
            {isLoading ? 'Đang đăng...' : 'Đăng tour'}
          </Text>
        </TouchableOpacity>
      </View>
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing[5], gap: Spacing[4] },
  section: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...(Shadows.sm as object),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  sectionContent: { padding: Spacing[4], gap: Spacing[4] },
  field: { gap: Spacing[1] },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 50,
  },
  textArea: { minHeight: 100, paddingTop: Spacing[3] },
  rowFields: { flexDirection: 'row', gap: Spacing[3] },
  selectedRouteBox: {
    gap: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    backgroundColor: Colors.surfaceContainerLowest,
  },
  selectedRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  routeIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  selectedRouteTextCol: {
    flex: 1,
    gap: 2,
  },
  routeValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  routeNameText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  routeActionRow: {
    gap: Spacing[3],
  },
  routeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
  },
  routeActionBtnSecondary: {
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  routeActionBtnDisabled: {
    borderColor: Colors.outlineVariant,
    opacity: 0.6,
  },
  routeActionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
  routeActionBtnTextSecondary: {
    color: Colors.primary,
  },
  routeActionBtnTextDisabled: {
    color: Colors.onSurfaceVariant,
  },
  mapRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  mapRouteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  difficultyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  difficultyChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.chip,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainer,
  },
  difficultyChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  pricingPolicyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    backgroundColor: Colors.primaryFixed + '20',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  pricingPolicyBtnText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.button,
  },
  draftBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  publishBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
  },
  publishBtnDisabled: { opacity: 0.7 },
  publishBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
});
