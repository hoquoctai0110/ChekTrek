import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm tuyến đường, tour...',
  onFilterPress,
  style,
  autoFocus = false,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={20} color={Colors.onSurfaceVariant} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.outline}
        style={styles.input}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={Colors.outline} />
        </TouchableOpacity>
      )}
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          activeOpacity={0.7}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '40',
    ...(Shadows.sm as object),
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    padding: 0,
    margin: 0,
  },
  filterButton: {
    padding: 2,
  },
});
