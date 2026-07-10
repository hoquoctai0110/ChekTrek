import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethodType } from '@/types';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';

interface PaymentProviderInfo {
  id: PaymentMethodType;
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const PAYMENT_PROVIDERS: PaymentProviderInfo[] = [
  {
    id: 'bank_transfer',
    name: 'Chuyển khoản Ngân hàng',
    iconName: 'business-outline',
  },
  {
    id: 'momo',
    name: 'Momo',
    iconName: 'wallet-outline',
  },
  {
    id: 'google_pay',
    name: 'Google Pay',
    iconName: 'logo-google',
  },
  {
    id: 'cash',
    name: 'Thanh toán bằng tiền mặt',
    iconName: 'cash-outline',
  },
];

interface PaymentMethodCardProps {
  method: PaymentProviderInfo;
  isSelected: boolean;
  onSelect: (id: PaymentMethodType) => void;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
      onPress={() => onSelect(method.id)}
      activeOpacity={0.85}
    >
      <View style={styles.contentRow}>
        <Ionicons
          name={method.iconName}
          size={22}
          color={isSelected ? '#FFFFFF' : '#0A2518'}
        />
        <Text style={[styles.name, isSelected ? styles.nameSelected : styles.nameUnselected]}>
          {method.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export { PaymentMethodCard, PAYMENT_PROVIDERS };
export type { PaymentProviderInfo };

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.full,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#0F291E',
    borderColor: '#0F291E',
  },
  cardUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: '#0A2518',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  nameSelected: {
    color: '#FFFFFF',
  },
  nameUnselected: {
    color: '#0A2518',
  },
});

