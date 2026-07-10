import React, { useState } from 'react';
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
import axios from 'axios';

import { RootStackParamList } from '@navigation/types';
import { CreateReviewPayload, reviewsApi } from '@services/api/reviews.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { Spacing } from '@theme/spacing';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'ReviewForm'>;

const getReviewErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return 'Không thể gửi đánh giá. Vui lòng thử lại.';

  const status = error.response?.status;
  const responseData = error.response?.data as
    | { message?: unknown; error?: unknown; detail?: unknown }
    | string
    | undefined;
  const backendMessage =
    typeof responseData === 'string'
      ? responseData
      : String(responseData?.message ?? responseData?.error ?? responseData?.detail ?? '');
  const normalizedMessage = backendMessage.toLowerCase();

  if (
    status === 409 ||
    normalizedMessage.includes('duplicate') ||
    normalizedMessage.includes('already reviewed') ||
    normalizedMessage.includes('already submitted') ||
    (normalizedMessage.includes('already') && normalizedMessage.includes('review'))
  ) {
    return 'Bạn đã đánh giá booking này rồi';
  }

  if (
    normalizedMessage.includes('not completed') ||
    normalizedMessage.includes('must be completed') ||
    normalizedMessage.includes('booking completed') ||
    (normalizedMessage.includes('completed') && normalizedMessage.includes('review'))
  ) {
    return 'Chỉ có thể đánh giá sau khi hoàn thành tour';
  }

  if (status === 401 || status === 403 || normalizedMessage.includes('unauthorized')) {
    return 'Bạn không có quyền đánh giá booking này';
  }

  return backendMessage || 'Không thể gửi đánh giá. Vui lòng thử lại.';
};

export const ReviewFormScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (rating < 1 || rating > 5) {
      setErrorMessage('Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }

    const payload: CreateReviewPayload = {
      bookingId: route.params.bookingId,
      tourId: route.params.tourId,
      rating,
      comment: comment.trim(),
    };

    console.log('[ReviewForm] submit payload:', payload);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewsApi.createReview(payload);
      Alert.alert('Đánh giá thành công', 'Cảm ơn bạn đã chia sẻ trải nghiệm.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[ReviewForm] submit failed:', error);
      setErrorMessage(getReviewErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá tour</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.tourLabel}>Tour</Text>
          <Text style={styles.tourTitle}>
            {route.params.tourTitle ?? `Tour #${route.params.tourId}`}
          </Text>

          <Text style={styles.label}>Đánh giá của bạn</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => {
                  setRating(star);
                  setErrorMessage(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${star} sao`}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={42}
                  color={star <= rating ? '#FFD700' : Colors.outlineVariant}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating > 0 ? `${rating}/5 sao` : 'Chọn từ 1 đến 5 sao'}
          </Text>

          <Text style={styles.label}>Nhận xét (không bắt buộc)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            placeholderTextColor={Colors.outline}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.characterCount}>{comment.length}/2000</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.onSurface },
  headerSpacer: { width: 40 },
  content: { padding: Spacing[4] },
  card: {
    padding: Spacing[5],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWhite,
    ...(Shadows.card as object),
  },
  tourLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.outline },
  tourTitle: {
    marginTop: Spacing[1],
    marginBottom: Spacing[6],
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onSurface,
  },
  label: {
    marginBottom: Spacing[3],
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center' },
  starButton: { padding: Spacing[1] },
  ratingHint: {
    marginTop: Spacing[2],
    marginBottom: Spacing[6],
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  commentInput: {
    minHeight: 140,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  characterCount: {
    marginTop: Spacing[1],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    textAlign: 'right',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginTop: Spacing[4],
    padding: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.errorContainer,
  },
  errorText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.error },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[5],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
});
