import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';

interface CategoryChipProps {
  label: string;
  isSelected?: boolean;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  isSelected = false,
  onPress,
  color = Colors.primary,
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        isSelected
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: Colors.surfaceWhite, borderColor: Colors.outlineVariant + '50' },
        style,
      ]}
    >
      <Text style={[styles.label, isSelected ? { color: Colors.surfaceWhite } : { color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});
