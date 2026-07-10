import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { MOCK_TRIPS } from '@utils/mockData';
import { RootStackParamList } from '@navigation/types';

type TripMapRouteProp = RouteProp<RootStackParamList, 'TripMap'>;
type TripMapNavProp = NativeStackNavigationProp<RootStackParamList>;

const { height } = Dimensions.get('window');

const MOCK_HAZARD_ZONES = [
  { id: 'hz1', latitude: 22.305, longitude: 103.778, radius: 300, title: 'Khu vực trơn trượt', severity: 'high' },
  { id: 'hz2', latitude: 22.298, longitude: 103.772, radius: 200, title: 'Nguy cơ lở đất', severity: 'medium' },
];

export const TripMapScreen: React.FC = () => {
  const route = useRoute<TripMapRouteProp>();
  const navigation = useNavigation<TripMapNavProp>();
  const trip = MOCK_TRIPS.find(t => t.id === route.params.tripId) ?? MOCK_TRIPS[0];

  const [isTracking, setIsTracking] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const warningSlide = useRef(new Animated.Value(0)).current;

  const mapRegion = {
    latitude: 22.3031,
    longitude: 103.7756,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const mockRoute = [
    { latitude: 22.29, longitude: 103.765 },
    { latitude: 22.295, longitude: 103.770 },
    { latitude: 22.300, longitude: 103.773 },
    { latitude: 22.3031, longitude: 103.7756 },
  ];

  useEffect(() => {
    if (showWarning) {
      Animated.timing(warningSlide, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [showWarning]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Route polyline */}
        <Polyline
          coordinates={mockRoute}
          strokeColor={Colors.primary}
          strokeWidth={4}
          lineDashPattern={[1]}
        />

        {/* Checkpoint markers */}
        {trip.checkpoints.map(cp => (
          <Marker
            key={cp.id}
            coordinate={cp.location}
            title={cp.name}
            pinColor={cp.isReached ? Colors.successGreen : Colors.primary}
          />
        ))}

        {/* Hazard zones */}
        {MOCK_HAZARD_ZONES.map(hz => (
          <React.Fragment key={hz.id}>
            <Circle
              center={{ latitude: hz.latitude, longitude: hz.longitude }}
              radius={hz.radius}
              fillColor={hz.severity === 'high' ? Colors.sosRed + '30' : Colors.warningAmber + '30'}
              strokeColor={hz.severity === 'high' ? Colors.sosRed : Colors.warningAmber}
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: hz.latitude, longitude: hz.longitude }}
              title={hz.title}
            >
              <View style={[
                styles.hazardMarker,
                { backgroundColor: hz.severity === 'high' ? Colors.sosRed : Colors.warningAmber }
              ]}>
                <Ionicons name="warning" size={16} color={Colors.surfaceWhite} />
              </View>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
        <TouchableOpacity
          style={[styles.trackingBtn, isTracking && styles.trackingBtnActive]}
          onPress={() => setIsTracking(t => !t)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isTracking ? 'navigate' : 'navigate-outline'}
            size={18}
            color={isTracking ? Colors.onPrimary : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Tracking status */}
      {isTracking && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Đang theo dõi GPS</Text>
        </View>
      )}

      {/* Warning Bottom Sheet */}
      {showWarning && (
        <Animated.View
          style={[
            styles.warningSheet,
            {
              transform: [
                {
                  translateY: warningSlide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.warningHeader}>
            <View style={styles.warningIconBg}>
              <Ionicons name="warning" size={22} color={Colors.warningAmber} />
            </View>
            <View style={styles.warningTextContent}>
              <Text style={styles.warningTitle}>Cảnh báo khu vực nguy hiểm</Text>
              <Text style={styles.warningSubtitle}>
                Có 2 khu vực nguy hiểm trên tuyến đường của bạn. Hãy cẩn thận!
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowWarning(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.hazardList}>
            {MOCK_HAZARD_ZONES.map(hz => (
              <View key={hz.id} style={styles.hazardItem}>
                <View
                  style={[
                    styles.hazardDot,
                    { backgroundColor: hz.severity === 'high' ? Colors.sosRed : Colors.warningAmber },
                  ]}
                />
                <View style={styles.hazardInfo}>
                  <Text style={styles.hazardName}>{hz.title}</Text>
                  <Text style={styles.hazardSeverity}>
                    {hz.severity === 'high' ? '🔴 Nguy hiểm cao' : '🟡 Nguy hiểm trung bình'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* SOS Quick Access */}
          <TouchableOpacity
            style={styles.sosQuickBtn}
            onPress={() => navigation.navigate('SOS')}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={18} color={Colors.surfaceWhite} />
            <Text style={styles.sosQuickText}>Kích hoạt SOS khẩn cấp</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* My Location Button */}
      <TouchableOpacity
        style={[styles.locationBtn, { bottom: showWarning ? 280 : 32 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={22} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    ...(Shadows.lg as object),
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  trackingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  trackingBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  trackingBanner: {
    position: 'absolute',
    top: 108,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.inverseSurface + 'EE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.chip,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successGreen,
  },
  trackingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.inverseOnSurface,
  },
  warningSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surfaceWhite,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    padding: Spacing[5],
    gap: Spacing[4],
    ...(Shadows.xl as object),
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  warningIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextContent: {
    flex: 1,
    gap: 3,
  },
  warningTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  warningSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  hazardList: {
    gap: Spacing[3],
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
  },
  hazardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  hazardInfo: {
    flex: 1,
    gap: 2,
  },
  hazardName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  hazardSeverity: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  sosQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.sosRed,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
  },
  sosQuickText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.surfaceWhite,
  },
  hazardMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  locationBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.lg as object),
  },
});

// Fix the locationBtn bottom
TripMapScreen.displayName = 'TripMapScreen';
