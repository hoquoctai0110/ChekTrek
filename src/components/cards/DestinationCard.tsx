import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Destination } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';

interface DestinationCardProps {
  destination: Destination;
  onPress: (destination: Destination) => void;
  style?: ViewStyle;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(destination)}
      activeOpacity={0.88}
      style={[styles.card, style]}
    >
      <Image source={{ uri: destination.imageUrl }} style={styles.image} resizeMode="cover" />
      {/* Gradient overlay */}
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.name}>{destination.name}</Text>
        <View style={styles.meta}>
          <Ionicons name="trail-sign-outline" size={12} color={Colors.surfaceWhite} />
          <Text style={styles.metaText}>{destination.trailCount} tuyến</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 200,
    borderRadius: Radius.card,
    overflow: 'hidden',
    ...(Shadows.md as object),
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    backgroundImage:
      'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)',
  },
  content: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    gap: 4,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.surfaceWhite,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.surfaceWhite + 'CC',
  },
});

