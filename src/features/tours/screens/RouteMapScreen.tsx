import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

import { MapboxUnavailableState } from '@components/common/MapboxUnavailableState';
import { RootStackParamList } from '@navigation/types';
import { routesApi, RouteWaypoint, TourRoute } from '@services/api/routes.api';
import { ensureMapboxConfigured, logMapboxRenderAttempt } from '@services/mapbox/mapboxConfig';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import {
  Coordinate,
  decodePolylineData,
  getManualRouteZoom,
  getRouteBounds,
  getRouteFallbackCenter,
  getRouteMidpoint,
} from '@utils/routeMap';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'RouteMap'>;
type RouteMarker = {
  id: string;
  coordinate: Coordinate;
  index?: number;
  type: 'START' | 'END' | 'CHECKPOINT';
};

type MapboxCameraRef = {
  setCamera: (config: {
    centerCoordinate?: Coordinate;
    zoomLevel?: number;
    animationDuration?: number;
  }) => void;
  fitBounds?: (
    ne: Coordinate,
    sw: Coordinate,
    padding?: number | number[],
    animationDuration?: number,
  ) => void;
};

const ROUTE_FIT_PADDING = [80, 60, 180, 60];

export const RouteMapScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const routeParams = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const mapboxState = ensureMapboxConfigured();
  const cameraRef = useRef<MapboxCameraRef | null>(null);
  const hasFitRouteRef = useRef(false);
  const routeId = routeParams.params?.routeId;
  const [route, setRoute] = useState<TourRoute | null>(null);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    console.log('[RouteMap] routeId:', routeId);

    if (!Number.isFinite(Number(routeId))) {
      setRoute(null);
      setWaypoints([]);
      setCoordinates([]);
      setErrorMessage('Thiếu mã lộ trình.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    hasFitRouteRef.current = false;

    try {
      const numericRouteId = Number(routeId);
      const [routeResponse, waypointResponse] = await Promise.all([
        routesApi.getRouteById(numericRouteId),
        routesApi.getWaypoints(numericRouteId),
      ]);
      console.log('[RouteMap] route response:', routeResponse);
      console.log('[RouteMap] waypoints:', waypointResponse.length);
      console.log('[RouteMap] route distance:', routeResponse.distanceKm);

      const decodedCoordinates = decodePolylineData(routeResponse.polylineData);
      console.log('[RouteMap] decoded coordinates count:', decodedCoordinates.length);
      console.log('[RouteMap] coordinates count:', decodedCoordinates.length);
      console.log('[RouteMap] start coordinate:', decodedCoordinates[0]);
      console.log('[RouteMap] end coordinate:', decodedCoordinates[decodedCoordinates.length - 1]);

      setRoute(routeResponse);
      setWaypoints(
        waypointResponse
          .filter(
            waypoint =>
              Number.isFinite(Number(waypoint.longitude)) &&
              Number.isFinite(Number(waypoint.latitude)),
          )
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
      );
      setCoordinates(decodedCoordinates);

      if (!routeResponse.polylineData?.trim() || decodedCoordinates.length === 0) {
        setErrorMessage('Không có dữ liệu lộ trình.');
      }
    } catch (error) {
      console.log('[RouteMap] failed to load route:', error);
      setRoute(null);
      setWaypoints([]);
      setCoordinates([]);
      setErrorMessage('Không thể tải lộ trình. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const fitRouteCamera = useCallback(
    (animationDuration = 700) => {
      if (!cameraRef.current) return;

      const routeDistance = Number(route?.distanceKm);
      const distanceKm = Number.isFinite(routeDistance) ? routeDistance : undefined;
      const targetZoom = getManualRouteZoom(distanceKm);
      console.log('[RouteMap] route distance:', route?.distanceKm);
      console.log('[RouteMap] coordinates count:', coordinates.length);
      console.log('[RouteMap] fit padding:', ROUTE_FIT_PADDING);
      console.log('[RouteMap] target zoom:', targetZoom);

      if (coordinates.length > 1 && targetZoom !== undefined) {
        const firstCoordinate = coordinates[0];
        const lastCoordinate = coordinates[coordinates.length - 1];
        const midpoint = getRouteMidpoint(coordinates);
        console.log('[RouteMap] using manual zoom for short route');
        console.log('[RouteMap] first coordinate:', firstCoordinate);
        console.log('[RouteMap] last coordinate:', lastCoordinate);
        console.log('[RouteMap] midpoint:', midpoint);
        console.log('[RouteMap] zoomLevel:', targetZoom);
        cameraRef.current.setCamera({
          centerCoordinate: midpoint,
          zoomLevel: targetZoom,
          animationDuration,
        });
        return;
      }

      if (coordinates.length > 1) {
        const bounds = getRouteBounds(coordinates);
        console.log('[RouteMap] fit route bounds:', bounds);
        if (cameraRef.current.fitBounds) {
          cameraRef.current.fitBounds(
            bounds.northEast,
            bounds.southWest,
            ROUTE_FIT_PADDING,
            animationDuration,
          );
        } else {
          cameraRef.current.setCamera({
            centerCoordinate: getRouteMidpoint(coordinates),
            zoomLevel: 12,
            animationDuration,
          });
        }
        return;
      }

      cameraRef.current.setCamera({
        centerCoordinate: coordinates[0] ?? getRouteFallbackCenter(route ?? undefined),
        zoomLevel: targetZoom ?? 12,
        animationDuration,
      });
    },
    [coordinates, route],
  );

  useEffect(() => {
    if (isLoading || hasFitRouteRef.current) return;

    fitRouteCamera();
    hasFitRouteRef.current = true;
  }, [fitRouteCamera, isLoading]);

  const requestCurrentLocation = useCallback(async (centerOnUser: boolean) => {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      console.log('[RouteMap] location permission:', permission.status);

      if (permission.status !== 'granted') {
        setHasLocationPermission(false);
        Alert.alert('Không có quyền truy cập vị trí');
        return;
      }

      setHasLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const nextUserLocation: Coordinate = [location.coords.longitude, location.coords.latitude];
      console.log('[RouteMap] user location:', nextUserLocation);
      console.log('[RouteMap] current location:', nextUserLocation);
      setUserLocation(nextUserLocation);

      if (centerOnUser) {
        cameraRef.current?.setCamera({
          centerCoordinate: nextUserLocation,
          zoomLevel: 16,
          animationDuration: 500,
        });
      }
    } catch (error) {
      console.log('[RouteMap] user location unavailable:', error);
      Alert.alert('Không thể lấy vị trí hiện tại');
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    requestCurrentLocation(false);
  }, [requestCurrentLocation]);

  const routeLine = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    }),
    [coordinates],
  );

  const markers = useMemo<RouteMarker[]>(() => {
    const waypointToCoordinate = (waypoint: RouteWaypoint): Coordinate => [
      Number(waypoint.longitude),
      Number(waypoint.latitude),
    ];
    const waypointStart = waypoints.find(
      waypoint => String(waypoint.category ?? '').toUpperCase() === 'START',
    );
    const waypointEnd = waypoints.find(
      waypoint => String(waypoint.category ?? '').toUpperCase() === 'END',
    );
    const startCoordinate = waypointStart ? waypointToCoordinate(waypointStart) : coordinates[0];
    const endCoordinate = waypointEnd
      ? waypointToCoordinate(waypointEnd)
      : coordinates[coordinates.length - 1];
    const nextMarkers: RouteMarker[] = [];

    if (startCoordinate) {
      console.log('[RouteMap] start marker coordinate:', startCoordinate);
      nextMarkers.push({
        id: 'route-start',
        coordinate: startCoordinate,
        type: 'START',
      });
    }

    waypoints
      .filter(waypoint => {
        const category = String(waypoint.category ?? '').toUpperCase();
        return category !== 'START' && category !== 'END';
      })
      .forEach((waypoint, index) => {
        nextMarkers.push({
          id: `waypoint-${waypoint.waypointId}-${index}`,
          coordinate: waypointToCoordinate(waypoint),
          index: index + 1,
          type: 'CHECKPOINT',
        });
      });

    if (
      endCoordinate &&
      (!startCoordinate || endCoordinate.join(',') !== startCoordinate.join(','))
    ) {
      console.log('[RouteMap] end marker coordinate:', endCoordinate);
      nextMarkers.push({
        id: 'route-end',
        coordinate: endCoordinate,
        type: 'END',
      });
    }

    return nextMarkers;
  }, [coordinates, waypoints]);

  if (hasLocationPermission) {
    console.log('[RouteMap] rendering UserLocation');
  }

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + Spacing[2] }]}>
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {route?.routeName ?? 'Bản đồ lộ trình'}
        </Text>
        {route?.distanceKm !== undefined && (
          <Text style={styles.headerSubtitle}>{route.distanceKm} km</Text>
        )}
      </View>
      <View style={styles.iconBtnPlaceholder} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Đang tải lộ trình...</Text>
        </View>
      </View>
    );
  }

  if (errorMessage && coordinates.length === 0) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <Ionicons name="map-outline" size={52} color={Colors.outline} />
          <Text style={styles.stateTitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRoute} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!mapboxState.isReady) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <MapboxUnavailableState
          message={mapboxState.error ?? 'Mapbox access token is missing in mobile runtime.'}
        />
      </View>
    );
  }

  logMapboxRenderAttempt('RouteMapScreen');

  return (
    <View style={styles.root}>
      {renderHeader()}
      <Mapbox.MapView style={styles.map} zoomEnabled scrollEnabled pitchEnabled rotateEnabled>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={coordinates[0] ?? getRouteFallbackCenter(route ?? undefined)}
          zoomLevel={12}
        />
        {coordinates.length > 1 && (
          <Mapbox.ShapeSource id="tour-route-line-source" shape={routeLine}>
            <Mapbox.LineLayer
              id="tour-route-line"
              style={{
                lineColor: '#00B050',
                lineWidth: 7,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {hasLocationPermission && <Mapbox.UserLocation visible={true} />}
        {userLocation && (
          <Mapbox.PointAnnotation id="route-map-user-location" coordinate={userLocation}>
            <View style={styles.userLocationOuter}>
              <View style={styles.userLocationMarker}>
                <View style={styles.userLocationDot} />
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}
        {markers.map(marker => (
          <Mapbox.PointAnnotation key={marker.id} id={marker.id} coordinate={marker.coordinate}>
            {marker.type === 'CHECKPOINT' ? (
              <View style={styles.checkpointMarker}>
                <Text style={styles.checkpointText}>{marker.index}</Text>
              </View>
            ) : (
              <View style={styles.pinWrap}>
                <View
                  style={[
                    styles.pinHead,
                    marker.type === 'START' && styles.startMarker,
                    marker.type === 'END' && styles.endMarker,
                  ]}
                >
                  <Ionicons
                    name={marker.type === 'START' ? 'play' : 'flag'}
                    size={14}
                    color={Colors.surfaceWhite}
                  />
                </View>
                <View
                  style={[
                    styles.pinTip,
                    marker.type === 'START' && styles.startPinTip,
                    marker.type === 'END' && styles.endPinTip,
                  ]}
                />
              </View>
            )}
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <TouchableOpacity
        style={[styles.zoomRouteBtn, { bottom: insets.bottom + 168 }]}
        onPress={() => fitRouteCamera(500)}
        activeOpacity={0.85}
      >
        <Ionicons name="expand" size={18} color={Colors.primary} />
        <Text style={styles.zoomRouteBtnText}>Zoom route</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.locationBtn, { bottom: insets.bottom + 118 }]}
        onPress={() => requestCurrentLocation(true)}
        activeOpacity={0.85}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="locate" size={18} color={Colors.primary} />
        )}
        <Text style={styles.locationBtnText}>Vị trí của tôi</Text>
      </TouchableOpacity>

      <View style={[styles.infoPanel, { paddingBottom: insets.bottom + Spacing[4] }]}>
        <Text style={styles.infoTitle}>{route?.routeName ?? 'Lộ trình tour'}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>{coordinates.length} điểm tuyến</Text>
          <Text style={styles.infoText}>{waypoints.length} waypoint</Text>
          {route?.estimatedDurationMin !== undefined && (
            <Text style={styles.infoText}>{route.estimatedDurationMin} phút</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    zIndex: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  map: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
  },
  stateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  startMarker: {
    backgroundColor: Colors.successGreen,
  },
  endMarker: {
    backgroundColor: Colors.error,
  },
  pinTip: {
    width: 10,
    height: 10,
    marginTop: -5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  startPinTip: {
    backgroundColor: Colors.successGreen,
  },
  endPinTip: {
    backgroundColor: Colors.error,
  },
  checkpointMarker: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  checkpointText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.surfaceWhite,
  },
  userLocationOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 97, 165, 0.18)',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  userLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  zoomRouteBtn: {
    position: 'absolute',
    right: Spacing[4],
    minHeight: 42,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...(Shadows.md as object),
  },
  zoomRouteBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  locationBtn: {
    position: 'absolute',
    right: Spacing[4],
    minHeight: 42,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...(Shadows.md as object),
  },
  locationBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  infoPanel: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    bottom: 0,
    padding: Spacing[4],
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    ...(Shadows.lg as object),
  },
  infoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  infoText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
});
