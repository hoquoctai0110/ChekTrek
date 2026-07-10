import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  error = false,
}) => {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('').slice(0, length);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={styles.container}
    >
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        autoFocus
      />
      {/* Visual boxes */}
      {Array.from({ length }).map((_, idx) => {
        const digit = digits[idx] ?? '';
        const isFilled = idx < digits.length;
        const isActive = idx === digits.length;

        return (
          <View
            key={idx}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              isActive && styles.boxActive,
              error && styles.boxError,
            ]}
          >
            <Text style={[styles.digit, isFilled && styles.digitFilled]}>
              {digit || ''}
            </Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed + '20',
  },
  boxActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.surfaceContainerLow,
  },
  boxError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorContainer + '30',
  },
  digit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurfaceVariant,
  },
  digitFilled: {
    color: Colors.onSurface,
  },
});
