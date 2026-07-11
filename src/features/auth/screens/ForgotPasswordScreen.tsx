import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { AuthInput } from '../components/AuthInput';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../validations/auth.validation';
import { s, vs, ms } from '@utils/responsive';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await new Promise(res => setTimeout(res, 700));
      navigation.navigate('OtpVerification', {
        email: data.email,
        flow: 'forgot-password',
      });
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi email. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200' }}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Bar ── */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0A2518" />
          </TouchableOpacity>

          {/* ── Icon ── */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconBg}>
              <Ionicons name="lock-closed-outline" size={36} color="#0A2518" />
            </View>
          </View>

          {/* ── Header ── */}
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Nhập email của bạn và chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
          </Text>

          {/* ── Form ── */}
          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label="Địa chỉ Email"
                  placeholder="example@email.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={
                    <Ionicons name="mail-outline" size={18} color="#0A2518" />
                  }
                />
              )}
            />

            <TouchableOpacity
              style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <Text style={styles.sendBtnText}>
                {isLoading ? 'Đang gửi...' : 'Gửi mã xác thực'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Back to Login ── */}
          <TouchableOpacity
            style={styles.backToLoginRow}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#0A2518" />
            <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(164, 219, 162, 0.75)', // Light green tint
  },
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: s(Spacing[5]),
    gap: vs(Spacing[6]),
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  iconWrapper: {
    alignItems: 'center',
    paddingTop: vs(Spacing[4]),
  },
  iconBg: {
    width: s(88),
    height: s(88),
    borderRadius: s(44),
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize['2xl']),
    color: '#0A2518',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
    textAlign: 'center',
    lineHeight: vs(24),
  },
  formContainer: {
    gap: vs(Spacing[4]),
  },
  sendBtn: {
    backgroundColor: '#0F291E',
    borderRadius: Radius.button,
    paddingVertical: vs(Spacing[4]),
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize.base),
    color: Colors.surfaceWhite,
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(Spacing[2]),
  },
  backToLoginText: {
    fontFamily: FontFamily.semiBold,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
  },
});
