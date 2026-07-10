import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { Colors } from '@theme/colors';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: 'dark-content' | 'light-content';
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  style,
  backgroundColor = Colors.background,
  statusBarStyle = 'dark-content',
}) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
