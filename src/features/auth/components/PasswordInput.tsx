import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from './AuthInput';
import { Colors } from '@theme/colors';

interface PasswordInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  onBlur?: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Mật khẩu',
  value,
  onChangeText,
  error,
  placeholder = 'Nhập mật khẩu',
  onBlur,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <AuthInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      error={error}
      placeholder={placeholder}
      secureTextEntry={!visible}
      autoCapitalize="none"
      onBlur={onBlur}
      rightIcon={
        <TouchableOpacity
          onPress={() => setVisible(v => !v)}
          activeOpacity={0.7}
          style={styles.eyeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={Colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      }
    />
  );
};

const styles = StyleSheet.create({
  eyeBtn: {
    padding: 4,
  },
});
