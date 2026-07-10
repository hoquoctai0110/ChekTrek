import React, { useState } from 'react';
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

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CreatePost'>;

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const isEditing = !!route.params?.postId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulated cover image placeholder
  const [hasCover, setHasCover] = useState(false);

  const addTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handlePublish = async (isDraft: boolean) => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung bài viết');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(res => setTimeout(res, 900));
      navigation.navigate('UploadSuccess', { type: 'post', title });
    } catch {
      Alert.alert('Lỗi', 'Không thể đăng bài. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Cover Image ── */}
        <TouchableOpacity
          style={styles.coverUpload}
          onPress={() => setHasCover(true)}
          activeOpacity={0.8}
        >
          {hasCover ? (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image" size={32} color={Colors.primary} />
              <Text style={styles.coverPlaceholderText}>Ảnh bìa đã chọn</Text>
              <TouchableOpacity
                onPress={() => setHasCover(false)}
                style={styles.removeCoverBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.coverEmpty}>
              <View style={styles.coverIcon}>
                <Ionicons name="camera-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.coverEmptyTitle}>Thêm ảnh bìa</Text>
              <Text style={styles.coverEmptySubtitle}>Khuyến nghị 16:9 · JPEG/PNG</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Title ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Tiêu đề *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Nhập tiêu đề hấp dẫn..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            multiline
          />
          <Text style={styles.charCount}>{title.length}/120</Text>
        </View>

        {/* ── Content ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nội dung *</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Chia sẻ trải nghiệm, mẹo trekking, hay câu chuyện chuyến đi của bạn..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Gallery ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bộ sưu tập ảnh</Text>
          <View style={styles.galleryGrid}>
            {[0, 1, 2, 3].map(idx => (
              <TouchableOpacity
                key={idx}
                style={styles.gallerySlot}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Thông báo', 'Tính năng chọn ảnh đang phát triển')}
              >
                <Ionicons name="add" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tags ── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Thẻ (tối đa 5)</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="#trekking #sapa..."
              placeholderTextColor={Colors.onSurfaceVariant}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={addTag} activeOpacity={0.7}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagList}>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => removeTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <Ionicons name="close" size={14} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.draftBtn}
          onPress={() => handlePublish(true)}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Ionicons name="save-outline" size={18} color={Colors.primary} />
          <Text style={styles.draftBtnText}>Lưu nháp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishBtn, isLoading && styles.publishBtnDisabled]}
          onPress={() => handlePublish(false)}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Ionicons name="send-outline" size={18} color={Colors.onPrimary} />
          <Text style={styles.publishBtnText}>{isLoading ? 'Đang đăng...' : 'Đăng ngay'}</Text>
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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.onSurface },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing[5], gap: Spacing[5] },
  coverUpload: {
    width: '100%',
    height: 180,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[2] },
  coverIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  coverEmptyTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.onSurface },
  coverEmptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.onSurfaceVariant },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], backgroundColor: Colors.primaryFixed + '30',
  },
  coverPlaceholderText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
  removeCoverBtn: { position: 'absolute', top: Spacing[3], right: Spacing[3] },
  field: { gap: Spacing[2] },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.onSurface },
  titleInput: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 70,
  },
  charCount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'right',
  },
  contentInput: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 200,
    lineHeight: 24,
  },
  galleryGrid: {
    flexDirection: 'row',
    gap: Spacing[3],
    flexWrap: 'wrap',
  },
  gallerySlot: {
    width: 72, height: 72,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  tagInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
    height: 50,
  },
  addTagBtn: {
    width: 50, height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.chip,
  },
  tagChipText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.primary },
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
  draftBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
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
  publishBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
});
