import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthStackParamList } from '@navigation/types';
import { API_CONFIG_ERROR } from '@constants/index';
import { authApi, extractApiErrorMessage } from '@services/api/auth.api';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { OtpInput } from '../components/OtpInput';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;
type RoutePropType = RouteProp<AuthStackParamList, 'OtpVerification'>;

const COUNTDOWN_SECONDS = 60;

const getOtpPurpose = (
  flow: 'register' | 'forgot-password',
): 'REGISTER_VERIFY' | 'FORGOT_PASSWORD' =>
  flow === 'register' ? 'REGISTER_VERIFY' : 'FORGOT_PASSWORD';

const getOtpErrorMessage = (error: unknown): string => {
  const rawMessage = extractApiErrorMessage(error, 'Khong the xu ly OTP. Vui long thu lai.');
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('invalid json')) {
    return 'Backend tu choi payload OTP. Can doi chieu lai enum `purpose` tren BE.';
  }

  if (normalized.includes('otp') && (normalized.includes('invalid') || normalized.includes('incorrect'))) {
    return 'Ma OTP khong dung. Vui long kiem tra lai.';
  }

  if (normalized.includes('expired')) {
    return 'Ma OTP da het han. Vui long gui lai ma moi.';
  }

  if (normalized.includes('email') && (normalized.includes('config') || normalized.includes('send'))) {
    return 'He thong gui email OTP dang gap loi. Vui long thu lai sau.';
  }

  return rawMessage;
};

export const OtpVerificationScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { email, flow } = route.params;
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(current => {
        if (current <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const resetOtpState = useCallback(() => {
    setOtp('');
    setHasError(false);
    setErrorMessage(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCanResend(false);
  }, []);

  const handleResend = useCallback(async () => {
    if (API_CONFIG_ERROR) {
      Alert.alert('Thieu cau hinh', API_CONFIG_ERROR);
      return;
    }

    setIsResending(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const response = await authApi.resendOtp(email, getOtpPurpose(flow));
      resetOtpState();
      Alert.alert('Da gui lai', response.message || `Ma OTP moi da duoc gui den ${email}`);
    } catch (error) {
      const message = getOtpErrorMessage(error);
      setHasError(true);
      setErrorMessage(message);
      Alert.alert('Gui lai OTP that bai', message);
    } finally {
      setIsResending(false);
    }
  }, [email, flow, resetOtpState]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setHasError(true);
      setErrorMessage('OTP phai gom 6 chu so.');
      return;
    }

    if (API_CONFIG_ERROR) {
      Alert.alert('Thieu cau hinh', API_CONFIG_ERROR);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const response = await authApi.verifyOtp(email, otp, getOtpPurpose(flow));

      if (__DEV__) {
        console.log('[Auth] OTP verify response:', response);
      }

      if (flow === 'register') {
        Alert.alert(
          'Xac thuc thanh cong',
          response.message || 'Tai khoan da duoc xac thuc. Vui long dang nhap.',
        );
        navigation.navigate('Login');
        return;
      }

      navigation.navigate('PasswordResetSuccess');
    } catch (error) {
      const message = getOtpErrorMessage(error);
      setHasError(true);
      setErrorMessage(message);
      Alert.alert('Xac thuc OTP that bai', message);
    } finally {
      setIsLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

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
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#0A2518" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <View style={styles.iconBg}>
                <Ionicons name="shield-checkmark" size={40} color="#0A2518" />
              </View>
            </View>

            <Text style={styles.title}>Xac thuc OTP</Text>
            <Text style={styles.subtitle}>
              Ma xac thuc da duoc gui den{'\n'}
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>

            <View style={styles.otpWrapper}>
              <OtpInput
                value={otp}
                onChange={value => {
                  setOtp(value);
                  setHasError(false);
                  setErrorMessage(null);
                }}
                length={6}
                error={hasError}
              />
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResend}
                  activeOpacity={0.7}
                  disabled={isLoading || isResending}
                >
                  <Text style={styles.resendBtn}>
                    {isResending ? 'Dang gui lai...' : 'Gui lai ma OTP'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>
                  Gui lai sau <Text style={styles.countdownNumber}>{countdown}s</Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyBtn,
                (isLoading || isResending || otp.length !== 6) && styles.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={isLoading || isResending || otp.length !== 6}
            >
              <Text style={styles.verifyBtnText}>
                {isLoading ? 'Dang xac thuc...' : 'Xac nhan'}
              </Text>
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
  },
  topBar: {
    paddingVertical: Spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  content: {
    flex: 1,
    paddingTop: Spacing[4],
    alignItems: 'center',
    gap: Spacing[5],
  },
  iconWrapper: {
    marginBottom: Spacing[2],
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A2518',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#0A2518',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: '#0A2518',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontFamily: FontFamily.bold,
    color: '#0A2518',
    textDecorationLine: 'underline',
  },
  otpWrapper: {
    width: '100%',
    gap: Spacing[3],
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendRow: {
    alignItems: 'center',
  },
  resendBtn: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#0A2518',
    textDecorationLine: 'underline',
  },
  countdownText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  countdownNumber: {
    fontFamily: FontFamily.bold,
    color: '#0A2518',
  },
  verifyBtn: {
    width: '100%',
    backgroundColor: '#0F291E',
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.surfaceWhite,
  },
});
