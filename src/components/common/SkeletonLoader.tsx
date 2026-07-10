import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// Preset skeleton card
export const TourCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <SkeletonLoader width="100%" height={160} borderRadius={12} />
    <View style={styles.cardContent}>
      <SkeletonLoader width="70%" height={20} />
      <SkeletonLoader width="50%" height={14} />
      <View style={styles.row}>
        <SkeletonLoader width={80} height={24} borderRadius={12} />
        <SkeletonLoader width={40} height={40} borderRadius={20} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  card: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceWhite,
    gap: 0,
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});
