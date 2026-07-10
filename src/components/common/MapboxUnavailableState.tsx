import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';

interface MapboxUnavailableStateProps {
  message: string;
  onRetry?: () => void;
}

export const MapboxUnavailableState: React.FC<MapboxUnavailableStateProps> = ({
  message,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={44} color={Colors.error} />
      <Text style={styles.title}>Mapbox chua san sang</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Thu lai</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
    backgroundColor: Colors.surfaceContainer,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
});
