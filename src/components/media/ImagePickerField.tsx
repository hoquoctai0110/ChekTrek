import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';
import { SelectedImage } from '@/types/media';

type ImagePickerFieldProps = {
  images: SelectedImage[];
  disabled?: boolean;
  isUploading?: boolean;
  helperText?: string | null;
  errorText?: string | null;
  onPickImages: () => void;
  onRemoveImage: (imageId: string) => void;
  onSetCoverImage: (imageId: string) => void;
};

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  images,
  disabled = false,
  isUploading = false,
  helperText,
  errorText,
  onPickImages,
  onRemoveImage,
  onSetCoverImage,
}) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.pickButton, disabled && styles.pickButtonDisabled]}
      onPress={onPickImages}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Ionicons name="images-outline" size={18} color={Colors.onPrimary} />
      <Text style={styles.pickButtonText}>{isUploading ? 'Đang tải ảnh lên...' : 'Chọn ảnh'}</Text>
    </TouchableOpacity>

    {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

    {images.length === 0 ? (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="image-outline" size={26} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Hình ảnh tour</Text>
        <Text style={styles.emptySubtitle}>Chưa có ảnh nào được chọn.</Text>
      </View>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewRow}
      >
        {images.map(image => (
          <View key={image.id} style={styles.previewCard}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveImage(image.id)}
              activeOpacity={0.85}
              disabled={disabled}
            >
              <Ionicons name="close" size={16} color={Colors.onPrimary} />
            </TouchableOpacity>

            {image.isCover ? (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Ảnh bìa</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.coverButton}
                onPress={() => onSetCoverImage(image.id)}
                activeOpacity={0.85}
                disabled={disabled}
              >
                <Text style={styles.coverButtonText}>Đặt làm ảnh bìa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing[3],
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  pickButtonDisabled: {
    opacity: 0.7,
  },
  pickButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    minHeight: 180,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    backgroundColor: Colors.surfaceContainerLowest,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  previewRow: {
    gap: Spacing[3],
    paddingRight: Spacing[2],
  },
  previewCard: {
    width: 180,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  previewImage: {
    width: '100%',
    height: 144,
    backgroundColor: Colors.surfaceContainer,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing[2],
    right: Spacing[2],
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 28, 48, 0.72)',
  },
  coverBadge: {
    position: 'absolute',
    left: Spacing[2],
    top: Spacing[2],
    paddingHorizontal: Spacing[2],
    paddingVertical: 6,
    borderRadius: Radius.chip,
    backgroundColor: Colors.successGreen,
  },
  coverBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.onPrimary,
  },
  coverButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceContainer,
  },
  coverButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
});
