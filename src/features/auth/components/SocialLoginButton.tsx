import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';

interface SocialLoginButtonProps {
  provider: 'google' | 'apple' | 'facebook';
  onPress: () => void;
}

const PROVIDER_CONFIG = {
  google: {
    label: 'Tiếp tục với Google',
    icon: 'logo-google' as const,
    color: '#DB4437',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  apple: {
    label: 'Tiếp tục với Apple',
    icon: 'logo-apple' as const,
    color: '#000000',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
  facebook: {
    label: 'Tiếp tục với Facebook',
    icon: 'logo-facebook' as const,
    color: '#1877F2',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
};

export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onPress,
}) => {
  const config = PROVIDER_CONFIG[provider];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={styles.label}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
});
