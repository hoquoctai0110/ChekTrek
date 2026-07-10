import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { API_CONFIG_ERROR } from '@constants/index';
import { authApi, extractApiErrorMessage } from '@services/api/auth.api';
import { UserRole } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { SocialLoginButton } from '../components/SocialLoginButton';
import {
  registerSchema,
  RegisterFormData,
  TREKKING_EXPERIENCE_OPTIONS,
} from '../validations/auth.validation';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;
type AccountType = 'trekker' | 'provider';

const EXPERIENCE_LABELS: Record<(typeof TREKKING_EXPERIENCE_OPTIONS)[number], string> = {
  OCCASIONAL: 'Occasional',
  EXPERIENCED: 'Experienced',
};

const getRegisterErrorMessage = (error: unknown, accountType: AccountType): string => {
  const rawMessage = extractApiErrorMessage(error, 'Không thể đăng ký. Vui lòng thử lại.');
  const normalized = rawMessage.toLowerCase();

  if (accountType === 'provider' && normalized.includes('unauthorized')) {
    return 'Đăng ký Provider chưa được backend Railway mở công khai.';
  }

  if (normalized.includes('email') && (normalized.includes('exists') || normalized.includes('already'))) {
    return 'Email đã tồn tại. Vui lòng dùng email khác.';
  }

  if (normalized.includes('email') && (normalized.includes('config') || normalized.includes('send'))) {
    return 'Đăng ký thành công nhưng hệ thống gửi email OTP đang gặp lỗi. Vui lòng liên hệ admin hoặc thử lại sau.';
  }

  if (normalized.includes('confirmpassword') || normalized.includes('password') && normalized.includes('match')) {
    return 'Mật khẩu và xác nhận mật khẩu không khớp.';
  }

  if (normalized.includes('unsupported trekking experience')) {
    return 'Giá trị kinh nghiệm trekking không được backend chấp nhận.';
  }

  return rawMessage;
};

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('trekker');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      trekkingExperience: 'OCCASIONAL',
      citizenIdImageUrl: '',
      agreeTerms: true,
    },
  });

  const selectedExperience = watch('trekkingExperience');

  const onSubmit = async (data: RegisterFormData) => {
    if (API_CONFIG_ERROR) {
      Alert.alert('Thieu cau hinh', API_CONFIG_ERROR);
      return;
    }

    setIsLoading(true);

    try {
      const role: UserRole = accountType === 'provider' ? 'TOUR_PROVIDER' : 'TREKKER';
      const response = await authApi.register(
        {
          fullName: data.fullName.trim(),
          dateOfBirth: data.dateOfBirth.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          trekkingExperience: data.trekkingExperience,
          citizenIdImageUrl: data.citizenIdImageUrl?.trim() || undefined,
          role,
        },
        accountType,
      );

      if (__DEV__) {
        console.log('[Auth] register response:', response);
      }

      Alert.alert('Đăng ký thành công', response.message);
      navigation.navigate('OtpVerification', {
        email: data.email.trim().toLowerCase(),
        flow: 'register',
      });
    } catch (error) {
      Alert.alert('Đăng ký thất bại', getRegisterErrorMessage(error, accountType));
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
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>CHEKTREK</Text>
            <Text style={styles.title}>ĐĂNG KÝ</Text>
          </View>

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Loại tài khoản</Text>
            <View style={styles.roleToggle}>
              <TouchableOpacity
                style={[styles.roleBtn, accountType === 'trekker' && styles.roleBtnActive]}
                onPress={() => setAccountType('trekker')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="footsteps-outline"
                  size={18}
                  color={accountType === 'trekker' ? Colors.surfaceWhite : '#0A2518'}
                />
                <Text
                  style={[
                    styles.roleBtnText,
                    accountType === 'trekker' && styles.roleBtnTextActive,
                  ]}
                >
                  Trekker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleBtn, accountType === 'provider' && styles.roleBtnActive]}
                onPress={() => setAccountType('provider')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="compass-outline"
                  size={18}
                  color={accountType === 'provider' ? Colors.surfaceWhite : '#0A2518'}
                />
                <Text
                  style={[
                    styles.roleBtnText,
                    accountType === 'provider' && styles.roleBtnTextActive,
                  ]}
                >
                  Provider
                </Text>
              </TouchableOpacity>
            </View>
            {accountType === 'provider' ? (
              <Text style={styles.roleHint}>
                Backend Railway hiện trả `401 Unauthorized` cho route register provider.
              </Text>
            ) : null}
          </View>

          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label=""
                  placeholder="Họ và tên"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.fullName?.message}
                  autoCapitalize="words"
                  leftIcon={<Ionicons name="person-outline" size={18} color="#0A2518" />}
                />
              )}
            />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label=""
                  placeholder="Ngày sinh (yyyy-MM-dd)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.dateOfBirth?.message}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="calendar-outline" size={18} color="#0A2518" />}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label=""
                  placeholder="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="mail-outline" size={18} color="#0A2518" />}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label=""
                  placeholder="Số điện thoại"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={18} color="#0A2518" />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <PasswordInput
                  label=""
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  placeholder="Mật khẩu"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value, onBlur } }) => (
                <PasswordInput
                  label=""
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  placeholder="Nhập lại mật khẩu"
                />
              )}
            />

            <Controller
              control={control}
              name="citizenIdImageUrl"
              render={({ field: { onChange, value, onBlur } }) => (
                <AuthInput
                  label=""
                  placeholder="Link ảnh CCCD (nếu có)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.citizenIdImageUrl?.message}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="image-outline" size={18} color="#0A2518" />}
                />
              )}
            />

            {accountType === 'trekker' ? (
              <View style={styles.experienceContainer}>
                <Text style={styles.experienceLabel}>Kinh nghiệm trekking</Text>
                <Controller
                  control={control}
                  name="trekkingExperience"
                  render={({ field: { onChange } }) => (
                    <View style={styles.experienceRow}>
                      {TREKKING_EXPERIENCE_OPTIONS.map(option => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.expPill,
                            selectedExperience === option && styles.expPillActive,
                          ]}
                          onPress={() => onChange(option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.expPillText,
                              selectedExperience === option && styles.expPillTextActive,
                            ]}
                          >
                            {EXPERIENCE_LABELS[option]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                />
                {errors.trekkingExperience?.message ? (
                  <Text style={styles.errorText}>{errors.trekkingExperience.message}</Text>
                ) : null}
                <Text style={styles.helperText}>
                  Backend Railway da reject gia tri `BEGINNER`, nen FE hien chi gui enum da audit
                  duoc.
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <Text style={styles.registerBtnText}>
                {isLoading ? 'Dang xu ly...' : 'Tao tai khoan'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoac</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialLoginButton
              provider="google"
              onPress={() => Alert.alert('Thông báo', 'Google Login đang phát triển')}
            />
            <SocialLoginButton
              provider="facebook"
              onPress={() => Alert.alert('Thông báo', 'Facebook Login đang phát triển')}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Bạn đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
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
    backgroundColor: 'rgba(164, 219, 162, 0.75)',
  },
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },
  header: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing[1],
  },
  logoText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: '#0A2518',
    letterSpacing: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: '#0A2518',
    textAlign: 'center',
    marginTop: Spacing[2],
  },
  roleContainer: {
    gap: Spacing[2],
  },
  roleLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    gap: Spacing[2],
  },
  roleBtnActive: {
    backgroundColor: '#0F291E',
  },
  roleBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  roleBtnTextActive: {
    color: Colors.surfaceWhite,
  },
  roleHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
    lineHeight: 18,
  },
  formContainer: {
    gap: Spacing[3],
  },
  experienceContainer: {
    gap: Spacing[2],
  },
  experienceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  experienceRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  expPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  expPillActive: {
    backgroundColor: '#0F291E',
  },
  expPillText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },
  expPillTextActive: {
    color: Colors.surfaceWhite,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: '#0A2518',
    lineHeight: 18,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  registerBtn: {
    backgroundColor: '#0F291E',
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.surfaceWhite,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginVertical: Spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(10, 37, 24, 0.1)',
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  loginText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  loginLink: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
    textDecorationLine: 'underline',
  },
});
