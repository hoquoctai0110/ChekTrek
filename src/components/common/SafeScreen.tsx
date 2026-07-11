import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top }, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
