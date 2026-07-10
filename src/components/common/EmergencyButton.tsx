import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';

interface EmergencyButtonProps {
  onPress: () => void;
  isActive?: boolean;
  label?: string;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onPress,
  isActive = false,
  label = 'SOS',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.2,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive, pulseAnim, opacityAnim]);

  return (
    <View style={styles.wrapper}>
      {isActive && (
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
          ]}
        />
      )}
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.button}>
        <Ionicons
          name="warning"
          size={28}
          color={isActive ? Colors.sosRed : Colors.surfaceWhite}
        />
        <Text style={[styles.label, !isActive && { color: Colors.surfaceWhite }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.sosRed + '30',
    borderWidth: 3,
    borderColor: Colors.sosRed,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.surfaceWhite,
    letterSpacing: 2,
  },
});
