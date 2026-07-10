import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { Colors } from '@theme/colors';
import { useAuthStore } from '@store/authStore';

// Screens — Phase 1 (existing)
import { WelcomeScreen } from '@features/auth/screens/WelcomeScreen';
import { LoginScreen } from '@features/auth/screens/LoginScreen';
import { RegisterScreen } from '@features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@features/auth/screens/ForgotPasswordScreen';

// Screens — Phase 2 (new)
import { OtpVerificationScreen } from '@features/auth/screens/OtpVerificationScreen';
import { PasswordResetSuccessScreen } from '@features/auth/screens/PasswordResetSuccessScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const isOfflineMode = useAuthStore(state => state.isOfflineMode);

  return (
    <Stack.Navigator
      initialRouteName={isOfflineMode ? 'Login' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="PasswordResetSuccess" component={PasswordResetSuccessScreen} />
      {/* Legacy screen - kept for backwards compat */}
      <Stack.Screen name="OtpVerify" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
};
