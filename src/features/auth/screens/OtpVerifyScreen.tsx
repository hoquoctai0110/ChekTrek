import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { PrimaryButton } from '@components/buttons/PrimaryButton';

export const OtpVerifyScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Xác Thực OTP</Text>
        <Text style={styles.subtitle}>Nhập mã OTP được gửi đến email của bạn.</Text>
        <PrimaryButton
          title="Xác thực"
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  back: { padding: Spacing[4] },
  content: { flex: 1, padding: Spacing[6], gap: Spacing[4], justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.onSurface },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.onSurfaceVariant },
});
