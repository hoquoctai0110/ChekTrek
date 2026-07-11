import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { AuthStackParamList } from '@navigation/types';
import { FontFamily } from '@theme/typography';

import { s, ms } from '@utils/responsive';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleStart = () => {
    navigation.replace('Login');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleStart();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableWithoutFeedback onPress={handleStart}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Full-Screen SVG Gradient Background */}
        <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
          <Defs>
            <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#bbfd7c" />
              <Stop offset="50%" stopColor="#acfd8c" />
              <Stop offset="100%" stopColor="#d8fff0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>

        {/* Logo and Brand Name */}
        <View style={styles.content}>
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>CHEKTREK</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: s(140),
    height: s(140),
    marginBottom: s(20),
  },
  brandText: {
    fontFamily: FontFamily.bold,
    fontSize: ms(28),
    color: '#07332b',
    letterSpacing: 2,
  },
});
