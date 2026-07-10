import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { RootStackParamList } from '@navigation/types';
import { ImagePickerField } from '@components/media/ImagePickerField';
import { invalidatePublicTourCardCache } from '@services/tours/publicTours';
import { uploadTourImages } from '@services/api/media.api';
import { toursApi } from '@services/api/tours.api';
import { pickImagesFromLibrary, removeSelectedImage, reorderSelectedImages } from '@services/media/imagePicker';
import { usePublicTourFeedStore } from '@store/publicTourFeedStore';
import { SelectedImage } from '@/types/media';
import { Colors } from '@theme/colors';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';
import { FontFamily, FontSize } from '@theme/typography';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CreateTour'>;
type TourDifficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
type SaveMode = 'draft' | 'published';
type SectionKey = 'basic' | 'route' | 'pricing' | 'images' | 'highlights';

type CreatedTourResponse = {
  id?: string | number;
  tourId?: string | number;
  title?: string;
};

const getApiErrorMessage = (error: unknown): string => {
  const maybeError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return (
    maybeError.response?.data?.message ??
    maybeError.message ??
    'Không thể xử lý yêu cầu. Vui lòng thử lại.'
  );
};

const extractTourId = (tour: unknown): string | null => {
  const candidate = tour as CreatedTourResponse | undefined;
  const rawTourId = candidate?.id ?? candidate?.tourId;
  if (rawTourId === undefined || rawTourId === null) {
    return null;
  }

  const normalizedTourId = String(rawTourId).trim();
  return normalizedTourId ? normalizedTourId : null;
};

const DIFFICULTIES: TourDifficulty[] = ['Easy', 'Moderate', 'Hard', 'Extreme'];

const DIFFICULTY_COLORS: Record<TourDifficulty, string> = {
  Easy: Colors.difficultyEasy,
  Moderate: Colors.difficultyModerate,
  Hard: Colors.difficultyHard,
  Extreme: Colors.difficultyExtreme,
};

const DIFFICULTY_LABELS: Record<TourDifficulty, string> = {
  Easy: 'Dễ',
  Moderate: 'Trung bình',
  Hard: 'Khó',
  Extreme: 'Cực khó',
};

export const CreateTourScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const invalidatePublicTourFeed = usePublicTourFeedStore(state => state.invalidate);
  const isEditing = Boolean(route.params?.tourId);
  const selectedRouteId = route.params?.routeId;
  const selectedRouteName = route.params?.routeName;
  const selectedRoutePoints = route.params?.routePoints;

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<TourDifficulty>('Moderate');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('');
  const [highlights, setHighlights] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [imagePickerMessage, setImagePickerMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [pendingUploadTourId, setPendingUploadTourId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    route: true,
    pricing: false,
    images: true,
    highlights: false,
  });

  const submitButtonLabel = useMemo(() => {
    if (isSubmitting && selectedImages.length > 0) {
      return 'Đang tải ảnh lên...';
    }

    if (isSubmitting) {
      return isEditing ? 'Đang lưu...' : 'Đang đăng...';
    }

    if (pendingUploadTourId && selectedImages.length > 0) {
      return 'Thử lại tải ảnh';
    }

    return 'Đăng tour';
  }, [isEditing, isSubmitting, pendingUploadTourId, selectedImages.length]);

  const imageHelperText = useMemo(() => {
    if (uploadProgress !== null) {
      return `Đang tải ảnh lên... ${Math.round(uploadProgress * 100)}%`;
    }

    if (imagePickerMessage) {
      return imagePickerMessage;
    }

    return 'Tối đa 5 ảnh. Ảnh đầu tiên hoặc ảnh được đánh dấu sẽ là ảnh bìa.';
  }, [imagePickerMessage, uploadProgress]);

  const toggleSection = (key: SectionKey) => {
    setSections(previousState => ({
      ...previousState,
      [key]: !previousState[key],
    }));
  };

  const openRouteMap = () => {
    navigation.navigate('CreateRouteMap', {
      tourId: route.params?.tourId,
      routeId: selectedRouteId,
      routeName: selectedRouteName,
      points: selectedRoutePoints,
      difficulty,
    });
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên tour.');
      return false;
    }

    if (!destination.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập điểm đến.');
      return false;
    }

    if (!selectedRouteId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tạo lộ trình trước khi đăng tour.');
      return false;
    }

    return true;
  };

  const handlePickImages = async () => {
    if (isSubmitting) {
      return;
    }

    const result = await pickImagesFromLibrary(selectedImages);

    if (result.status === 'success') {
      setSelectedImages(result.images);
      setImagePickerMessage(result.message ?? null);
      setUploadErrorMessage(null);
      return;
    }

    if (result.status === 'permission-denied' || result.status === 'validation-error') {
      setImagePickerMessage(result.message ?? null);
      return;
    }

    setImagePickerMessage(null);
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages(previousImages => removeSelectedImage(previousImages, imageId));
  };

  const handleSetCoverImage = (imageId: string) => {
    setSelectedImages(previousImages => reorderSelectedImages(previousImages, imageId));
  };

  const buildPayload = () => ({
    routeId: selectedRouteId as number,
    title: title.trim(),
    description: description.trim(),
    price: Number(price) || 0,
    maxParticipants: Number(maxParticipants) || 0,
    difficulty,
    duration: Number(duration) || 0,
    meetingPoint: destination.trim(),
    startDate: '',
    endDate: '',
  });

  const finalizeSuccess = (mode: SaveMode, imagesUploaded: boolean) => {
    invalidatePublicTourCardCache();
    invalidatePublicTourFeed();
    setPendingUploadTourId(null);
    setUploadErrorMessage(null);
    setUploadProgress(null);

    const successMessage =
      mode === 'draft'
        ? 'Tour đã được lưu thành công.'
        : imagesUploaded
          ? 'Tạo tour và tải ảnh lên thành công.'
          : 'Tạo tour thành công.';

    Alert.alert('Thành công', successMessage, [
      {
        text: 'OK',
        onPress: () => navigation.navigate('ManageTours'),
      },
    ]);
  };

  const performImageUpload = async (tourId: string, mode: SaveMode) => {
    if (selectedImages.length === 0) {
      finalizeSuccess(mode, false);
      return;
    }

    await uploadTourImages(tourId, selectedImages, {
      onProgress: progress => setUploadProgress(progress),
    });

    finalizeSuccess(mode, true);
  };

  const handleSave = async (mode: SaveMode) => {
    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setUploadErrorMessage(null);
    setImagePickerMessage(null);

    try {
      if (pendingUploadTourId && selectedImages.length > 0) {
        await performImageUpload(pendingUploadTourId, mode);
        return;
      }

      const payload = buildPayload();
      const savedTour = isEditing && route.params?.tourId
        ? await toursApi.updateMyTour(route.params.tourId, payload)
        : await toursApi.createMyTour(payload);

      const resolvedTourId = extractTourId(savedTour);
      const fallbackTourId = route.params?.tourId;
      const targetTourId = resolvedTourId ?? fallbackTourId ?? null;

      if (!targetTourId && selectedImages.length > 0) {
        throw new Error('Không xác định được tourId để tải ảnh lên.');
      }

      if (!targetTourId) {
        finalizeSuccess(mode, false);
        return;
      }

      try {
        await performImageUpload(targetTourId, mode);
      } catch (uploadError) {
        setPendingUploadTourId(targetTourId);
        setUploadProgress(null);
        setUploadErrorMessage(getApiErrorMessage(uploadError));
        invalidatePublicTourCardCache();
        invalidatePublicTourFeed();

        Alert.alert(
          'Tải ảnh lên thất bại',
          'Tour đã được tạo nhưng tải ảnh lên thất bại. Bạn có thể thử lại ngay trên màn hình này mà không tạo tour lần thứ hai.',
        );
      }
    } catch (error) {
      Alert.alert('Không thể lưu tour', getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const SectionHeader = ({
    label,
    icon,
    sectionKey,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    sectionKey: SectionKey;
  }) => (
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Chỉnh sửa tour' : 'Tạo tour mới'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
                  {DIFFICULTIES.map(item => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.difficultyChip,
                        difficulty === item && {
                          backgroundColor: `${DIFFICULTY_COLORS[item]}20`,
                          borderColor: DIFFICULTY_COLORS[item],
                        },
                      ]}
                      onPress={() => setDifficulty(item)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.difficultyChipText,
                          difficulty === item && {
                            color: DIFFICULTY_COLORS[item],
                            fontFamily: FontFamily.bold,
                          },
                        ]}
                      >
                        {DIFFICULTY_LABELS[item]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

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
                      {selectedRouteId ? `Đã chọn lộ trình: #${selectedRouteId}` : 'Chưa chọn lộ trình'}
                    </Text>
                    {selectedRouteName ? <Text style={styles.routeNameText}>{selectedRouteName}</Text> : null}
                  </View>
                </View>

                <View style={styles.routeActionRow}>
                  <TouchableOpacity style={styles.routeActionBtn} onPress={openRouteMap} activeOpacity={0.8}>
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
                <View style={[styles.field, styles.flexField]}>
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
                <View style={[styles.field, styles.flexField]}>
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
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader label="Giá & ưu đãi" icon="pricetag-outline" sectionKey="pricing" />
          {sections.pricing && (
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
                onPress={() => Alert.alert('Thông báo', 'Lưu tour trước để cài đặt chính sách giá chi tiết.')}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={16} color={Colors.primary} />
                <Text style={styles.pricingPolicyBtnText}>Thiết lập chính sách giá chi tiết</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader label="Hình ảnh tour" icon="images-outline" sectionKey="images" />
          {sections.images && (
            <View style={styles.sectionContent}>
              <ImagePickerField
                images={selectedImages}
                disabled={isSubmitting}
                isUploading={isSubmitting && selectedImages.length > 0 && uploadProgress !== null}
                helperText={imageHelperText}
                errorText={uploadErrorMessage}
                onPickImages={handlePickImages}
                onRemoveImage={handleRemoveImage}
                onSetCoverImage={handleSetCoverImage}
              />

              {pendingUploadTourId && uploadErrorMessage ? (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                  <View style={styles.warningTextWrapper}>
                    <Text style={styles.warningTitle}>Tour đã được tạo nhưng tải ảnh lên thất bại</Text>
                    <Text style={styles.warningText}>
                      Nhấn nút đăng tour để thử lại tải ảnh với tour hiện có. App sẽ không tạo tour lần thứ hai.
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader label="Điểm nổi bật" icon="star-outline" sectionKey="highlights" />
          {sections.highlights && (
            <View style={styles.sectionContent}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Điểm nổi bật (mỗi dòng 1 điểm)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={'VD:\nNgắm bình minh từ đỉnh núi\nTrải nghiệm văn hóa bản địa\n...'}
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.draftBtn, (!selectedRouteId || isSubmitting || Boolean(pendingUploadTourId)) && styles.actionDisabled]}
          onPress={() => handleSave('draft')}
          activeOpacity={0.8}
          disabled={isSubmitting || !selectedRouteId || Boolean(pendingUploadTourId)}
        >
          <Ionicons name="save-outline" size={18} color={Colors.primary} />
          <Text style={styles.draftBtnText}>Lưu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishBtn, (isSubmitting || !selectedRouteId) && styles.publishBtnDisabled]}
          onPress={() => handleSave('published')}
          activeOpacity={0.85}
          disabled={isSubmitting || !selectedRouteId}
        >
          <Ionicons
            name={pendingUploadTourId ? 'refresh-outline' : 'cloud-upload-outline'}
            size={18}
            color={Colors.onPrimary}
          />
          <Text style={styles.publishBtnText}>{submitButtonLabel}</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[5],
    gap: Spacing[4],
  },
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  sectionContent: {
    padding: Spacing[4],
    gap: Spacing[4],
  },
  field: {
    gap: Spacing[1],
  },
  flexField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing[3],
  },
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
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
  rowFields: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
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
    paddingHorizontal: Spacing[3],
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
  pricingPolicyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    backgroundColor: `${Colors.primaryFixed}20`,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  pricingPolicyBtnText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    backgroundColor: Colors.errorContainer,
  },
  warningTextWrapper: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onErrorContainer,
  },
  warningText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onErrorContainer,
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
  publishBtnDisabled: {
    opacity: 0.7,
  },
  publishBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
});
