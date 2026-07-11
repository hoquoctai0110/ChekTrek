import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
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
import { useAuthStore } from '@store/authStore';
import { authApi } from '@services/api/auth.api';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { SocialLoginButton } from '../components/SocialLoginButton';
import { loginSchema, LoginFormData } from '../validations/auth.validation';
import { s, vs, ms } from '@utils/responsive';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

const getLoginErrorMessage = (error: unknown): string => {
  const fallback = 'Email hoặc mật khẩu không đúng.';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeAxiosError = error as {
    response?: {
      data?: {
        message?: unknown;
        error?: unknown;
      };
    };
    message?: unknown;
  };

  const backendMessage =
    maybeAxiosError.response?.data?.message ??
    maybeAxiosError.response?.data?.error ??
    maybeAxiosError.message;

  return typeof backendMessage === 'string' && backendMessage.trim()
    ? backendMessage
    : fallback;
};

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { login, isLoading, isOfflineMode } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (isOfflineMode) {
      Alert.alert('Offline', 'Bạn cần đăng nhập ít nhất một lần khi có Internet.');
      return;
    }

    try {
      const authResponse = await authApi.login({
        email: data.email,
        password: data.password,
      });

      if (__DEV__) {
        console.log('[LoginScreen] mapped login response user:', authResponse.user);
      }

      await login(authResponse.user, authResponse.tokens);
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', getLoginErrorMessage(error));
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
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>CHEKTREK</Text>
            <Text style={styles.title}>ĐĂNG NHẬP</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.formContainer}>
          {isOfflineMode ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={18} color={Colors.warningAmber} />
              <Text style={styles.offlineBannerText}>
                Bạn cần đăng nhập ít nhất một lần khi có Internet.
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <AuthInput
                label="Email"
                placeholder="example@email.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={
                  <Ionicons name="mail-outline" size={18} color={Colors.onSurfaceVariant} />
                }
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <PasswordInput
                label="Mật khẩu"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                placeholder="Nhập mật khẩu"
              />
            )}
          />

          {/* ── Remember Me & Forgot Password ── */}
          <View style={styles.rememberRow}>
            <View style={styles.rememberLeft}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ true: Colors.primary, false: Colors.outlineVariant }}
                thumbColor={Colors.surfaceWhite}
                style={styles.switch}
              />
              <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Login Button ── */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.loginBtnText}>Đang đăng nhập...</Text>
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social Login ── */}
          <SocialLoginButton
            provider="google"
            onPress={() => Alert.alert('Thông báo', 'Google Login đang phát triển')}
          />
          <SocialLoginButton
            provider="facebook"
            onPress={() => Alert.alert('Thông báo', 'Facebook Login đang phát triển')}
          />
          </View>

          {/* ── Register Link ── */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(164, 219, 162, 0.75)', // Light green tint based on screenshot
  },
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: s(Spacing[5]),
    gap: vs(Spacing[8]),
  },
  header: {
    alignItems: 'center',
    gap: vs(Spacing[2]),
  },
  logo: {
    width: s(64),
    height: s(64),
    marginBottom: vs(Spacing[1]),
  },
  logoText: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize.sm),
    color: '#0A2518',
    letterSpacing: 2,
    marginBottom: vs(Spacing[4]),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize['3xl']),
    color: '#0A2518',
    textAlign: 'center',
  },
  formContainer: {
    gap: vs(Spacing[4]),
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningAmber + '18',
    borderWidth: 1,
    borderColor: Colors.warningAmber + '55',
  },
  offlineBannerText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: '#0A2518',
    lineHeight: 20,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rememberLeft: {
    display: 'none', // Hide remember me based on screenshot
  },
  switch: {
    display: 'none',
  },
  rememberText: {
    display: 'none',
  },
  forgotText: {
    fontFamily: FontFamily.medium,
    fontSize: ms(FontSize.sm),
    color: '#0A2518',
  },
  loginBtn: {
    backgroundColor: '#0F291E',
    borderRadius: Radius.button,
    paddingVertical: vs(Spacing[4]),
    alignItems: 'center',
    marginTop: vs(Spacing[2]),
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize.md),
    color: Colors.surfaceWhite,
    textTransform: 'uppercase',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(Spacing[3]),
    marginVertical: vs(Spacing[2]),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(10, 37, 24, 0.1)',
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: ms(FontSize.sm),
    color: '#0A2518',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(Spacing[4]),
  },
  registerText: {
    fontFamily: FontFamily.regular,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
  },
  registerLink: {
    fontFamily: FontFamily.bold,
    fontSize: ms(FontSize.base),
    color: '#0A2518',
    textDecorationLine: 'underline',
  },
});
