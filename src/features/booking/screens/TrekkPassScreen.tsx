import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { RootStackParamList } from '@navigation/types';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Data ──────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  subtitle: string;
  price?: string;
  duration?: string;
  tier: 'freemium' | 'trip' | 'safety' | 'safety_pro';
}

const PLANS: Plan[] = [
  {
    id: 'freemium',
    name: 'FREEMIUM',
    subtitle: 'Khám phá cung đường, xem bản đồ cơ bản và đánh giá cộng đồng',
    tier: 'freemium',
  },
  {
    id: 'trip_48h',
    name: 'TRIP PASS',
    subtitle: '',
    price: '29,000đ',
    duration: '48 giờ',
    tier: 'trip',
  },
  {
    id: 'safety_1m',
    name: 'SAFETY PASS',
    subtitle: '',
    price: '39,000đ',
    duration: 'tháng',
    tier: 'safety',
  },
  {
    id: 'safety_3m',
    name: 'SAFETY PASS',
    subtitle: '',
    price: '99,000đ',
    duration: '3 tháng',
    tier: 'safety',
  },
  {
    id: 'safety_6m',
    name: 'SAFETY PASS',
    subtitle: '',
    price: '234,000đ',
    duration: '6 tháng',
    tier: 'safety',
  },
  {
    id: 'safety_pro',
    name: 'SAFETY PASS PRO',
    subtitle: '',
    price: '429,000đ',
    duration: 'năm',
    tier: 'safety_pro',
  },
];

interface Feature {
  label: string;
  freemium: string;
  trip: string;
  safety: string;
  safetyPro: string;
}

const FEATURES: Feature[] = [
  {
    label: 'Xem tất cả cung đường khi online',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Thông tin cơ bản (đường, độ khó, độ cao)',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Đánh giá cộng đồng',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Quỹ ứng dụng & checklist bằng AI',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Quỹ ý ghép tour phù hợp',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Tải bản đồ offline',
    freemium: 'Tối đa 3 bản đồ',
    trip: '1 bản đồ /48h',
    safety: 'Không giới hạn',
    safetyPro: 'Không giới hạn',
  },
  {
    label: 'SOS khẩn cấp',
    freemium: '✗',
    trip: '1 lần hệ /48h',
    safety: '1 lần hệ',
    safetyPro: '5 lần hệ',
  },
  {
    label: 'Chia sẻ vị trí trực tiếp',
    freemium: '✗',
    trip: 'Tối đa 5 lần hệ',
    safety: 'Tối đa 5 lần hệ',
    safetyPro: 'Tối đa 5 lần hệ',
  },
  {
    label: 'Hướng dẫn viên xác thực & đánh giá',
    freemium: '✓',
    trip: '✓',
    safety: '✓',
    safetyPro: '✓',
  },
  {
    label: 'Thời hạn sử dụng',
    freemium: 'Không giới hạn',
    trip: '48h',
    safety: '1 tháng',
    safetyPro: '12 tháng',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export const TrekkPassScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<string>('freemium');

  const selected = PLANS.find(p => p.id === selectedPlan)!;
  const isPaid = selected.tier !== 'freemium';

  const handleAction = () => {
    if (isPaid) {
      // Navigate to payment method selection
      navigation.navigate('PaymentMethod', {
        bookingId: `trekkpass_${selectedPlan}`,
      });
    } else {
      // Freemium: just save and go back
      Alert.alert(
        'Đã lưu',
        'Bạn đang sử dụng gói FREEMIUM. Nâng cấp bất cứ lúc nào để trải nghiệm đầy đủ tính năng!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
  };
  const getColHighlight = (tier: Plan['tier']) => {
    const t = selected.tier;
    if (tier === 'freemium') return t === 'freemium';
    if (tier === 'trip') return t === 'trip';
    if (tier === 'safety') return t === 'safety';
    if (tier === 'safety_pro') return t === 'safety_pro';
    return false;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Gradient Background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="bgGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E5F9CE" />
              <Stop offset="100%" stopColor="#A2EDB4" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#0A2518" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn TrekkPass của bạn</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Cards */}
        <View style={styles.planList}>
          {PLANS.map(plan => {
            const isSelected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.85}
              >
                <View style={styles.planCardInner}>
                  <View style={styles.planCardLeft}>
                    <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                      {plan.name}
                    </Text>
                    {plan.subtitle ? (
                      <Text style={[styles.planSubtitle, isSelected && styles.planSubtitleSelected]}>
                        {plan.subtitle}
                      </Text>
                    ) : plan.price ? (
                      <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                        {plan.price} / {plan.duration}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color="#00F582" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comparison Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, styles.featureCell]}>Tính năng</Text>
            {[
              { key: 'freemium', label: 'FREEMIUM', tier: 'freemium' as Plan['tier'] },
              { key: 'trip', label: 'TRIP PASS', tier: 'trip' as Plan['tier'] },
              { key: 'safety', label: 'SAFETY PASS', tier: 'safety' as Plan['tier'] },
              { key: 'safety_pro', label: 'SAFETY PASS PRO', tier: 'safety_pro' as Plan['tier'] },
            ].map(col => (
              <View
                key={col.key}
                style={[
                  styles.tableColHeader,
                  getColHighlight(col.tier) && styles.tableColHeaderActive,
                ]}
              >
                <Text
                  style={[
                    styles.tableHeaderText,
                    getColHighlight(col.tier) && styles.tableHeaderTextActive,
                  ]}
                  numberOfLines={3}
                >
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Table Rows */}
          {FEATURES.map((feature, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}
            >
              <Text style={[styles.tableCell, styles.featureCell]}>{feature.label}</Text>
              {[feature.freemium, feature.trip, feature.safety, feature.safetyPro].map(
                (val, ci) => {
                  const tiers: Plan['tier'][] = ['freemium', 'trip', 'safety', 'safety_pro'];
                  const isHighlighted = getColHighlight(tiers[ci]);
                  const isCheck = val === '✓';
                  const isCross = val === '✗';
                  return (
                    <View
                      key={ci}
                      style={[
                        styles.tableValueCell,
                        isHighlighted && styles.tableValueCellActive,
                      ]}
                    >
                      {isCheck ? (
                        <Ionicons name="checkmark" size={16} color={isHighlighted ? '#0A2518' : '#0A7A4A'} />
                      ) : isCross ? (
                        <Ionicons name="close" size={16} color="rgba(10,37,24,0.35)" />
                      ) : (
                        <Text
                          style={[
                            styles.tableCellText,
                            isHighlighted && styles.tableCellTextActive,
                          ]}
                          numberOfLines={3}
                        >
                          {val}
                        </Text>
                      )}
                    </View>
                  );
                },
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAction} activeOpacity={0.85}>
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Defs>
                <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#00F582" />
                  <Stop offset="100%" stopColor="#E3F53C" />
                </SvgLinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#btnGrad)" rx={28} ry={28} />
            </Svg>
          </View>
          <Text style={styles.actionBtnText}>{isPaid ? 'Thanh Toán' : 'Lưu'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F53C',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#0A2518',
    flex: 1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
  },

  // Plan Cards
  planList: { gap: Spacing[3] },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(10,37,24,0.12)',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  planCardSelected: {
    backgroundColor: '#0F291E',
    borderColor: '#0F291E',
    elevation: 4,
    shadowOpacity: 0.18,
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  planCardLeft: { flex: 1, gap: 3 },
  planName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    letterSpacing: 0.5,
  },
  planNameSelected: { color: '#FFFFFF' },
  planSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.65)',
    lineHeight: 18,
  },
  planSubtitleSelected: { color: 'rgba(255,255,255,0.75)' },
  planPrice: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A7A4A',
  },
  planPriceSelected: { color: '#00F582' },

  // Table
  tableContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10,37,24,0.07)',
  },
  tableRowEven: {
    backgroundColor: 'rgba(0,200,83,0.04)',
  },
  tableHeaderCell: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#0A2518',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
  },
  featureCell: {
    flex: 2.2,
    paddingLeft: Spacing[3],
    paddingRight: Spacing[1],
  },
  tableColHeader: {
    flex: 1.3,
    paddingVertical: Spacing[3],
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,200,83,0.06)',
  },
  tableColHeaderActive: {
    backgroundColor: '#0F291E',
  },
  tableHeaderText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#0A7A4A',
    textAlign: 'center',
  },
  tableHeaderTextActive: {
    color: '#00F582',
  },
  tableCell: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#0A2518',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    textAlignVertical: 'center',
    lineHeight: 15,
  },
  tableValueCell: {
    flex: 1.3,
    paddingVertical: Spacing[2],
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,200,83,0.06)',
  },
  tableValueCellActive: {
    backgroundColor: 'rgba(0,245,130,0.15)',
  },
  tableCellText: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: 'rgba(10,37,24,0.75)',
    textAlign: 'center',
    lineHeight: 14,
  },
  tableCellTextActive: {
    fontFamily: FontFamily.semiBold,
    color: '#0A2518',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    backgroundColor: 'rgba(229,249,206,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(10,37,24,0.1)',
  },
  actionBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#00F582',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    zIndex: 1,
  },
});
