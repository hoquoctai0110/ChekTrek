import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
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
import { Discount, RefundPolicy } from '@/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'PricingPolicy'>;

const formatCurrency = (v: string) =>
  v ? parseInt(v.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : '';

export const PricingPolicyScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();

  const [basePrice, setBasePrice] = useState('2850000');
  const [isLoading, setIsLoading] = useState(false);

  // Discounts
  const [discounts, setDiscounts] = useState<Discount[]>([
    { id: 'd1', label: 'Nhóm 5+ người', type: 'percentage', value: 10, minParticipants: 5 },
    { id: 'd2', label: 'Đặt trước 30 ngày', type: 'percentage', value: 15 },
  ]);

  // Refund policies
  const [refundPolicies, setRefundPolicies] = useState<RefundPolicy[]>([
    { daysBefore: 7, refundPercentage: 100, description: 'Hủy trước 7 ngày: hoàn 100%' },
    { daysBefore: 3, refundPercentage: 50, description: 'Hủy trước 3 ngày: hoàn 50%' },
    { daysBefore: 0, refundPercentage: 0, description: 'Hủy trong ngày: không hoàn' },
  ]);

  const [hasGroupDiscount, setHasGroupDiscount] = useState(true);
  const [hasEarlyBirdDiscount, setHasEarlyBirdDiscount] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(res => setTimeout(res, 700));
      Alert.alert('Thành công', 'Chính sách giá đã được cập nhật', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const parsedPrice = parseInt(basePrice.replace(/\D/g, ''), 10) || 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giá & Chính sách</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Base Price ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="cash-outline" size={16} color={Colors.primary} /> Giá cơ bản
          </Text>
          <View style={styles.priceInputRow}>
            <TextInput
              style={styles.priceInput}
              value={parsedPrice.toLocaleString('vi-VN')}
              onChangeText={t => setBasePrice(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.onSurfaceVariant}
            />
            <Text style={styles.priceSuffix}>đ / người</Text>
          </View>
          {/* Preview tiers */}
          <View style={styles.priceTiers}>
            {[1, 5, 10].map(n => (
              <View key={n} style={styles.tierRow}>
                <Text style={styles.tierLabel}>{n} người</Text>
                <Text style={styles.tierValue}>
                  {(parsedPrice * n).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Discounts ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="pricetag-outline" size={16} color={Colors.primary} /> Ưu đãi & Giảm giá
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Giảm giá theo nhóm</Text>
              <Text style={styles.switchSub}>5+ người giảm 10%</Text>
            </View>
            <Switch
              value={hasGroupDiscount}
              onValueChange={setHasGroupDiscount}
              trackColor={{ true: Colors.primary, false: Colors.outlineVariant }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Đặt sớm (Early Bird)</Text>
              <Text style={styles.switchSub}>Đặt trước 30 ngày giảm 15%</Text>
            </View>
            <Switch
              value={hasEarlyBirdDiscount}
              onValueChange={setHasEarlyBirdDiscount}
              trackColor={{ true: Colors.primary, false: Colors.outlineVariant }}
              thumbColor={Colors.white}
            />
          </View>

          {(hasGroupDiscount || hasEarlyBirdDiscount) && (
            <View style={styles.discountPreview}>
              {hasGroupDiscount && (
                <View style={styles.discountBadge}>
                  <Ionicons name="people-outline" size={13} color={Colors.primary} />
                  <Text style={styles.discountBadgeText}>-10% nhóm 5+</Text>
                </View>
              )}
              {hasEarlyBirdDiscount && (
                <View style={styles.discountBadge}>
                  <Ionicons name="time-outline" size={13} color={Colors.successGreen} />
                  <Text style={[styles.discountBadgeText, { color: Colors.successGreen }]}>-15% đặt sớm</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Refund Policy ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} /> Chính sách hoàn tiền
          </Text>
          {refundPolicies.map((policy, idx) => (
            <View key={idx} style={styles.refundRow}>
              <View style={[styles.refundIcon, { backgroundColor: policy.refundPercentage > 0 ? Colors.successGreen + '18' : Colors.errorContainer }]}>
                <Text style={[styles.refundPct, { color: policy.refundPercentage > 0 ? Colors.successGreen : Colors.error }]}>
                  {policy.refundPercentage}%
                </Text>
              </View>
              <View style={styles.refundInfo}>
                <Text style={styles.refundDesc}>{policy.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Additional Notes ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} /> Ghi chú thêm
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Điều kiện tham gia, đồ dùng cần chuẩn bị, lưu ý đặc biệt..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ── Save Button ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.saveBtnText}>{isLoading ? 'Đang lưu...' : 'Lưu chính sách'}</Text>
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
  scrollContent: { padding: Spacing[5], gap: Spacing[4] },
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
    ...(Shadows.md as object),
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.primaryFixed + '15',
  },
  priceInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    paddingVertical: Spacing[3],
  },
  priceSuffix: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  priceTiers: { gap: Spacing[2] },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tierLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.onSurfaceVariant },
  tierValue: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.onSurface },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: { gap: 2 },
  switchLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.onSurface },
  switchSub: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.onSurfaceVariant },
  discountPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.chip,
  },
  discountBadgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  refundIcon: {
    width: 48, height: 48, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  refundPct: { fontFamily: FontFamily.bold, fontSize: FontSize.sm },
  refundInfo: { flex: 1 },
  refundDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.onSurface },
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
  },
  textArea: { minHeight: 100, paddingTop: Spacing[3] },
  footer: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
});
