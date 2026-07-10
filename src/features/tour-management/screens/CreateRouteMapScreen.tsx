import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import axios from 'axios';

import { MapboxUnavailableState } from '@components/common/MapboxUnavailableState';
import { RootStackParamList } from '@navigation/types';
import {
  ensureMapboxConfigured,
  getMapboxAccessToken,
  logMapboxRenderAttempt,
} from '@services/mapbox/mapboxConfig';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { GeneratedRouteType, RoutePoint, routesApi, WaypointType } from '@services/api/routes.api';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CreateRouteMap'>;
type Coordinate = [number, number];
type PickerMode = 'START' | 'END' | 'CHECKPOINT';

type NamedRoutePoint = RoutePoint & {
  name?: string;
};

type GeneratedRoute = {
  routeId: number;
  routeName: string;
  routePoints: RoutePoint[];
  polylineData?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
};

type SearchResult = {
  id: string;
  name: string;
  placeName: string;
  center: Coordinate;
};

type BackendErrorPayload = {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
  title?: unknown;
  errors?: unknown;
  data?: unknown;
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

const DEFAULT_CENTER: Coordinate = [105.8342, 21.0278];
const SEARCH_LIMIT = 5;
const ROUTE_FIT_PADDING = [90, 60, 260, 60];
const ROUTE_TYPE_OPTIONS: Array<{ label: string; value: GeneratedRouteType; note?: string }> = [
  { label: 'Một chiều', value: 'ONE_WAY' },
  { label: 'Khứ hồi', value: 'ROUND_TRIP', note: 'Đi và về cùng một đường' },
  { label: 'Vòng tròn', value: 'LOOP', note: 'Lộ trình vòng tròn quay về điểm bắt đầu' },
];

const pointToCoordinate = (point: RoutePoint): Coordinate => [point.longitude, point.latitude];

const coordinateToPoint = (coordinate: Coordinate, name?: string): NamedRoutePoint => ({
  latitude: coordinate[1],
  longitude: coordinate[0],
  name,
});

const stringifyErrorDetail = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value;
  if (value == null) return undefined;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getGenerateRouteErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Route generation failed for an unknown reason.';
  }

  const responseData = error.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData;

  const payload = responseData as BackendErrorPayload | undefined;
  const nestedData = payload?.data as BackendErrorPayload | string | undefined;
  const candidates = [
    payload?.message,
    payload?.error,
    payload?.detail,
    payload?.title,
    typeof nestedData === 'object' ? nestedData?.message : nestedData,
    payload?.errors,
  ];

  for (const candidate of candidates) {
    const detail = stringifyErrorDetail(candidate);
    if (detail) return detail;
  }

  return error.message || 'The route service returned an error without a message.';
};

const encodePolyline = (points: RoutePoint[]): string =>
  JSON.stringify(points.map(point => [point.longitude, point.latitude]));

const isFiniteCoordinate = (coordinate: unknown): coordinate is Coordinate =>
  Array.isArray(coordinate) &&
  coordinate.length >= 2 &&
  Number.isFinite(Number(coordinate[0])) &&
  Number.isFinite(Number(coordinate[1]));

const normalizeCoordinatePair = (pair: Coordinate): Coordinate => {
  const first = Number(pair[0]);
  const second = Number(pair[1]);

  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return [second, first];
  }

  return [first, second];
};

const decodeStandardPolyline = (encoded: string): Coordinate[] => {
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates: Coordinate[] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }

  return coordinates;
};

const decodePolylineData = (polylineData?: string): Coordinate[] => {
  const value = polylineData?.trim();
  if (!value) return [];

  try {
    if (value.startsWith('[')) {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(isFiniteCoordinate).map(pair => normalizeCoordinatePair(pair));
    }

    return decodeStandardPolyline(value);
  } catch {
    return [];
  }
};

const toRad = (value: number) => (value * Math.PI) / 180;

const distanceBetween = (a: RoutePoint, b: RoutePoint): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const calculateDistanceKm = (points: RoutePoint[]): number =>
  points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + distanceBetween(points[index - 1], point);
  }, 0);

const getWaypointType = (index: number, total: number): WaypointType => {
  if (index === 0) return 'START';
  if (index === total - 1) return 'END';
  return 'CHECKPOINT';
};

const getBounds = (coordinates: Coordinate[]) => {
  const longitudes = coordinates.map(coordinate => coordinate[0]);
  const latitudes = coordinates.map(coordinate => coordinate[1]);

  return {
    southWest: [Math.min(...longitudes), Math.min(...latitudes)] as Coordinate,
    northEast: [Math.max(...longitudes), Math.max(...latitudes)] as Coordinate,
  };
};

const getMidpoint = (coordinates: Coordinate[]): Coordinate => {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1] ?? first;
  return [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2];
};

export const CreateRouteMapScreen: React.FC = () => {
  const mapboxState = ensureMapboxConfigured();
  const mapboxAccessToken = getMapboxAccessToken();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<MapboxCameraRef | null>(null);
  const initialCameraCenter = useMemo<Coordinate>(
    () =>
      route.params?.points?.[0]
        ? [route.params.points[0].longitude, route.params.points[0].latitude]
        : DEFAULT_CENTER,
    [route.params?.points],
  );

  const [routeName, setRouteName] = useState(route.params?.routeName ?? '');
  const [routeType, setRouteType] = useState<GeneratedRouteType>('ONE_WAY');
  const [points, setPoints] = useState<RoutePoint[]>(route.params?.points ?? []);
  const [pickerMode, setPickerMode] = useState<PickerMode>('START');
  const [startPoint, setStartPoint] = useState<NamedRoutePoint | null>(
    route.params?.points?.[0] ?? null,
  );
  const [endPoint, setEndPoint] = useState<NamedRoutePoint | null>(
    route.params?.points?.length ? route.params.points[route.params.points.length - 1] : null,
  );
  const [checkpoints, setCheckpoints] = useState<NamedRoutePoint[]>([]);
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinate>(initialCameraCenter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchQuery, setSelectedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedRouteType = ROUTE_TYPE_OPTIONS.find(option => option.value === routeType);

  const draftedGeneratedPoints = useMemo<RoutePoint[]>(() => {
    if (!startPoint) return [];
    if (routeType === 'LOOP') return [startPoint, ...checkpoints, startPoint];
    if (!endPoint) return [];
    if (routeType === 'ROUND_TRIP') return [startPoint, ...checkpoints, endPoint, startPoint];
    return [startPoint, ...checkpoints, endPoint];
  }, [checkpoints, endPoint, routeType, startPoint]);

  const activePoints = generatedRoute?.routePoints.length
    ? generatedRoute.routePoints
    : draftedGeneratedPoints.length
      ? draftedGeneratedPoints
      : points;

  const distanceKm = useMemo(
    () => generatedRoute?.distanceKm ?? calculateDistanceKm(activePoints),
    [activePoints, generatedRoute?.distanceKm],
  );
  const estimatedDurationMin = useMemo(
    () =>
      generatedRoute?.estimatedDurationMin ??
      Math.max(1, Math.round((calculateDistanceKm(activePoints) / 3.5) * 60)),
    [activePoints, generatedRoute?.estimatedDurationMin],
  );
  const canGenerateRoute =
    routeType === 'LOOP'
      ? Boolean(startPoint && checkpoints.length > 0)
      : Boolean(startPoint && endPoint);

  const coordinates = useMemo<Coordinate[]>(
    () => activePoints.map(pointToCoordinate),
    [activePoints],
  );

  const geoJson = useMemo(
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

  const fitRouteCamera = useCallback((routeCoordinates: Coordinate[], animationDuration = 650) => {
    if (!cameraRef.current || routeCoordinates.length === 0) return;

    if (routeCoordinates.length > 1) {
      const bounds = getBounds(routeCoordinates);
      if (cameraRef.current.fitBounds) {
        cameraRef.current.fitBounds(
          bounds.northEast,
          bounds.southWest,
          ROUTE_FIT_PADDING,
          animationDuration,
        );
        return;
      }

      cameraRef.current.setCamera({
        centerCoordinate: getMidpoint(routeCoordinates),
        zoomLevel: 12,
        animationDuration,
      });
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: routeCoordinates[0],
      zoomLevel: 14,
      animationDuration,
    });
  }, []);

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: initialCameraCenter,
      zoomLevel: 11,
      animationDuration: 0,
    });
    setCurrentMapCenter(initialCameraCenter);
  }, [initialCameraCenter]);

  useEffect(() => {
    setGeneratedRoute(null);

    if (routeType === 'LOOP') {
      setEndPoint(startPoint);
      if (pickerMode === 'END') setPickerMode('CHECKPOINT');
      return;
    }

    if (endPoint && startPoint && endPoint === startPoint) {
      setEndPoint(null);
    }
  }, [endPoint, pickerMode, routeType, startPoint]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    if (query === selectedSearchQuery) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(false);

      try {
        const proximity = `${currentMapCenter[0]},${currentMapCenter[1]}`;
        const params = [
          `access_token=${encodeURIComponent(mapboxAccessToken)}`,
          `limit=${SEARCH_LIMIT}`,
          'country=vn',
          'language=vi',
          `proximity=${encodeURIComponent(proximity)}`,
        ].join('&');
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error('Mapbox geocoding request failed');
        }

        const data = await response.json();
        const features = Array.isArray(data.features) ? data.features : [];
        const results = features
          .filter((feature: { center?: unknown }) => Array.isArray(feature.center))
          .map(
            (feature: {
              id?: string;
              text?: string;
              place_name?: string;
              center: [number, number];
            }) => ({
              id: feature.id ?? `${feature.center[0]}-${feature.center[1]}`,
              name: feature.text ?? feature.place_name ?? 'Unknown location',
              placeName: feature.place_name ?? feature.text ?? 'Unknown location',
              center: feature.center,
            }),
          );

        setSearchResults(results);
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [currentMapCenter, mapboxAccessToken, searchQuery, selectedSearchQuery]);

  const resetGeneratedPreview = () => {
    if (generatedRoute) {
      setGeneratedRoute(null);
    }
  };

  const handleRouteTypeChange = (nextRouteType: GeneratedRouteType) => {
    console.log('[CreateRouteMap] routeType =', nextRouteType);
    setRouteType(nextRouteType);
    resetGeneratedPreview();
    if (nextRouteType === 'LOOP') {
      setEndPoint(startPoint);
      setPickerMode(startPoint ? 'CHECKPOINT' : 'START');
    }
  };

  const setRoutePointForMode = (point: NamedRoutePoint, mode: PickerMode) => {
    resetGeneratedPreview();

    if (mode === 'START') {
      setStartPoint(point);
      if (routeType === 'LOOP') {
        setEndPoint(point);
        setPickerMode('CHECKPOINT');
      } else {
        setPickerMode('END');
      }
      console.log('[CreateRouteMap] start', point);
      return;
    }

    if (mode === 'END') {
      if (routeType === 'LOOP') {
        setCheckpoints(prev => {
          const next = [...prev, point];
          console.log('[CreateRouteMap] checkpoints', next);
          return next;
        });
        setPickerMode('CHECKPOINT');
        return;
      }

      setEndPoint(point);
      setPickerMode('CHECKPOINT');
      console.log('[CreateRouteMap] end', point);
      return;
    }

    if (!startPoint && !endPoint) {
      setPoints(prev => [...prev, point]);
      console.log('[CreateRouteMap] checkpoints', [...points, point]);
      return;
    }

    setCheckpoints(prev => {
      const next = [...prev, point];
      console.log('[CreateRouteMap] checkpoints', next);
      return next;
    });
  };

  const handleMapPress = (event: { geometry?: { coordinates?: [number, number] } }) => {
    const coordinatesFromPress = event.geometry?.coordinates;
    if (!coordinatesFromPress) return;
    setRoutePointForMode(coordinateToPoint(coordinatesFromPress), pickerMode);
  };

  const handleCameraChanged = (event: { properties?: { center?: Coordinate } }) => {
    const center = event.properties?.center;
    if (Array.isArray(center) && center.length === 2) {
      setCurrentMapCenter(center);
    }
  };

  const centerOnSearchResult = (result: SearchResult) => {
    setCurrentMapCenter(result.center);
    cameraRef.current?.setCamera({
      centerCoordinate: result.center,
      zoomLevel: 14,
      animationDuration: 600,
    });
    setSearchQuery(result.placeName);
    setSelectedSearchQuery(result.placeName);
    setSearchResults([]);
    setHasSearched(false);
    Keyboard.dismiss();
  };

  const handleUseSearchResult = (result: SearchResult, mode: PickerMode) => {
    centerOnSearchResult(result);
    setRoutePointForMode(coordinateToPoint(result.center, result.name), mode);
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setSelectedSearchQuery('');
  };

  const handleGenerateRoute = async () => {
    console.log('[CreateRouteMap] routeType =', routeType);

    if (!startPoint) {
      Alert.alert('Missing route points', 'Please select a start point.');
      return;
    }

    if (routeType !== 'LOOP' && !endPoint) {
      Alert.alert('Missing route points', 'Please select both a start and end point.');
      return;
    }

    if (routeType === 'LOOP' && checkpoints.length === 0) {
      Alert.alert('Missing checkpoint', 'Please add at least one checkpoint for a loop route.');
      return;
    }

    const resolvedEndPoint = routeType === 'LOOP' ? startPoint : endPoint;
    if (!resolvedEndPoint) return;

    const payload = {
      routeName: routeName.trim() || 'New tour route',
      routeType,
      start: {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        name: startPoint.name || 'Start',
      },
      end: {
        latitude: resolvedEndPoint.latitude,
        longitude: resolvedEndPoint.longitude,
        name:
          routeType === 'LOOP' ? resolvedEndPoint.name || 'Start' : resolvedEndPoint.name || 'End',
      },
      checkpoints: checkpoints.map((checkpoint, index) => ({
        latitude: checkpoint.latitude,
        longitude: checkpoint.longitude,
        name: checkpoint.name || `Checkpoint ${index + 1}`,
      })),
      difficulty: route.params?.difficulty,
    };

    console.log('[CreateRouteMap] generate payload =', payload);
    setIsGenerating(true);

    try {
      const response = await routesApi.generateRoute(payload);
      console.log('[CreateRouteMap] generate response =', response);

      const decodedCoordinates = decodePolylineData(response.polylineData);
      const previewPoints =
        decodedCoordinates.length > 0
          ? decodedCoordinates.map(coordinate => coordinateToPoint(coordinate))
          : draftedGeneratedPoints;

      const nextGeneratedRoute = {
        routeId: response.routeId,
        routeName: response.routeName ?? payload.routeName,
        routePoints: previewPoints,
        polylineData: response.polylineData,
        distanceKm: response.distanceKm,
        estimatedDurationMin: response.estimatedDurationMin,
      };

      setGeneratedRoute(nextGeneratedRoute);
      fitRouteCamera(previewPoints.map(pointToCoordinate));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[CreateRouteMap] generate route failed:', {
          message: error.message,
          status: error.response?.status,
          responseData: error.response?.data,
          requestData: error.config?.data,
        });
      } else {
        console.error('[CreateRouteMap] generate route failed with non-Axios error:', error);
      }

      Alert.alert('Generate failed', getGenerateRouteErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGeneratedRoute = () => {
    if (!generatedRoute) return;

    console.log(
      '[CreateRouteMap] final routeId returned to CreateTourScreen:',
      generatedRoute.routeId,
    );
    navigation.navigate('CreateTour', {
      tourId: route.params?.tourId,
      routeId: generatedRoute.routeId,
      routeName: generatedRoute.routeName,
      routePoints: generatedRoute.routePoints,
    });
  };

  const handleManualSave = async () => {
    if (points.length < 2) {
      Alert.alert('Missing route', 'Please add at least two manual route points.');
      return;
    }

    const [manualStartPoint] = points;
    const manualEndPoint = points[points.length - 1];
    const manualDistanceKm = calculateDistanceKm(points);
    const manualEstimatedDurationMin = Math.max(1, Math.round((manualDistanceKm / 3.5) * 60));

    setIsSaving(true);
    try {
      const routePayload = {
        routeName: routeName.trim() || 'New tour route',
        polylineData: encodePolyline(points),
        distanceKm: Number(manualDistanceKm.toFixed(2)),
        estimatedDurationMin: manualEstimatedDurationMin,
        difficulty: route.params?.difficulty,
        startLatitude: manualStartPoint.latitude,
        startLongitude: manualStartPoint.longitude,
        endLatitude: manualEndPoint.latitude,
        endLongitude: manualEndPoint.longitude,
        elevationGain: 0,
      };

      console.log('[CreateRouteMapScreen] route payload before POST /routes:', routePayload);
      const createdRoute = await routesApi.createRoute(routePayload);
      console.log('[CreateRouteMapScreen] route response:', createdRoute);

      await Promise.all(
        points.map(async (point, index) => {
          const waypointPayload = {
            name:
              index === 0 ? 'Start' : index === points.length - 1 ? 'End' : `Checkpoint ${index}`,
            description: '',
            latitude: point.latitude,
            longitude: point.longitude,
            category: getWaypointType(index, points.length),
            orderIndex: index,
            mandatory: true,
          };
          const waypointResponse = await routesApi.createWaypoint(
            createdRoute.routeId,
            waypointPayload,
          );
          return waypointResponse;
        }),
      );

      navigation.navigate('CreateTour', {
        tourId: route.params?.tourId,
        routeId: createdRoute.routeId,
        routeName: routePayload.routeName,
        routePoints: points,
      });
    } catch (error) {
      console.log('[CreateRouteMapScreen] route save failed:', error);
      Alert.alert('Save failed', 'Could not save manual route. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = () => {
    resetGeneratedPreview();

    if (pickerMode === 'CHECKPOINT' && checkpoints.length > 0) {
      setCheckpoints(prev => prev.slice(0, -1));
      return;
    }

    if (points.length > 0) {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
    setCheckpoints([]);
    setPoints([]);
    setGeneratedRoute(null);
    setPickerMode('START');
  };

  const renderPointSummary = (label: string, point: NamedRoutePoint | null, color: string) => (
    <View style={styles.pointSummaryItem}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <Text style={styles.pointSummaryText} numberOfLines={1}>
        {point?.name ||
          (point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : label)}
      </Text>
    </View>
  );

  if (!mapboxState.isReady) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Route Map</Text>
          <View style={styles.iconBtn} />
        </View>
        <MapboxUnavailableState
          message={mapboxState.error ?? 'Mapbox access token is missing in mobile runtime.'}
        />
      </View>
    );
  }

  logMapboxRenderAttempt('CreateRouteMapScreen');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Route</Text>
        <TouchableOpacity
          onPress={generatedRoute ? handleUseGeneratedRoute : handleManualSave}
          style={[
            styles.saveBtn,
            ((generatedRoute ? false : points.length < 2) || isSaving) && styles.saveBtnDisabled,
          ]}
          activeOpacity={0.8}
          disabled={(generatedRoute ? false : points.length < 2) || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Ionicons
              name={generatedRoute ? 'checkmark' : 'save-outline'}
              size={20}
              color={Colors.onPrimary}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search place name"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
        {(searchResults.length > 0 || isSearching || hasSearched) && (
          <View style={styles.searchResults}>
            {isSearching ? (
              <Text style={styles.searchStateText}>Searching...</Text>
            ) : searchResults.length > 0 ? (
              searchResults.map(result => (
                <View key={result.id} style={styles.searchResultItem}>
                  <TouchableOpacity
                    onPress={() => centerOnSearchResult(result)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text style={styles.searchResultSubtitle} numberOfLines={2}>
                      {result.placeName}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.searchActionRow}>
                    <TouchableOpacity
                      style={styles.searchActionBtn}
                      onPress={() => handleUseSearchResult(result, 'START')}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.searchActionText}>Start</Text>
                    </TouchableOpacity>
                    {routeType !== 'LOOP' ? (
                      <TouchableOpacity
                        style={styles.searchActionBtn}
                        onPress={() => handleUseSearchResult(result, 'END')}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.searchActionText}>End</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.searchActionBtn}
                      onPress={() => handleUseSearchResult(result, 'CHECKPOINT')}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.searchActionText}>Checkpoint</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.searchStateText}>No places found</Text>
            )}
          </View>
        )}
      </View>

      <Mapbox.MapView
        style={styles.map}
        onPress={handleMapPress}
        onCameraChanged={handleCameraChanged}
        zoomEnabled
        scrollEnabled
        pitchEnabled
        rotateEnabled
      >
        <Mapbox.Camera ref={cameraRef} />
        {coordinates.length > 1 && (
          <Mapbox.ShapeSource id="route-line-source" shape={geoJson}>
            <Mapbox.LineLayer
              id="route-line"
              style={{
                lineColor: generatedRoute ? Colors.successGreen : Colors.primary,
                lineWidth: generatedRoute ? 6 : 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {startPoint && routeType !== 'ONE_WAY' && (
          <Mapbox.PointAnnotation id="route-start-end" coordinate={pointToCoordinate(startPoint)}>
            <View style={styles.pinWrap}>
              <View style={[styles.pinHead, styles.startEndMarker]}>
                <Text style={styles.startEndMarkerText}>S/E</Text>
              </View>
              <View style={[styles.pinTip, styles.startEndPinTip]} />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {startPoint && routeType === 'ONE_WAY' && (
          <Mapbox.PointAnnotation id="route-start" coordinate={pointToCoordinate(startPoint)}>
            <View style={styles.pinWrap}>
              <View style={[styles.pinHead, styles.startMarker]}>
                <Ionicons name="play" size={14} color={Colors.surfaceWhite} />
              </View>
              <View style={[styles.pinTip, styles.startPinTip]} />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {endPoint && routeType === 'ONE_WAY' && (
          <Mapbox.PointAnnotation id="route-end" coordinate={pointToCoordinate(endPoint)}>
            <View style={styles.pinWrap}>
              <View style={[styles.pinHead, styles.endMarker]}>
                <Ionicons name="flag" size={14} color={Colors.surfaceWhite} />
              </View>
              <View style={[styles.pinTip, styles.endPinTip]} />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {endPoint && routeType === 'ROUND_TRIP' && (
          <Mapbox.PointAnnotation id="route-turnaround" coordinate={pointToCoordinate(endPoint)}>
            <View style={styles.pinWrap}>
              <View style={[styles.pinHead, styles.turnaroundMarker]}>
                <Ionicons name="return-down-back" size={15} color={Colors.surfaceWhite} />
              </View>
              <View style={[styles.pinTip, styles.turnaroundPinTip]} />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {checkpoints.map((checkpoint, index) => (
          <Mapbox.PointAnnotation
            key={`${checkpoint.latitude}-${checkpoint.longitude}-${index}`}
            id={`route-checkpoint-${index}`}
            coordinate={pointToCoordinate(checkpoint)}
          >
            <View style={styles.checkpointMarker}>
              <Text style={styles.checkpointText}>{index + 1}</Text>
            </View>
          </Mapbox.PointAnnotation>
        ))}
        {!startPoint &&
          !endPoint &&
          points.map((point, index) => (
            <Mapbox.PointAnnotation
              key={`${point.latitude}-${point.longitude}-${index}`}
              id={`route-point-${index}`}
              coordinate={pointToCoordinate(point)}
            >
              <View
                style={[
                  styles.marker,
                  index === 0 && styles.startMarker,
                  index === points.length - 1 && points.length > 1 && styles.endMarker,
                ]}
              >
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </Mapbox.PointAnnotation>
          ))}
      </Mapbox.MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing[4] }]}>
        <TextInput
          style={styles.input}
          placeholder="Route name"
          placeholderTextColor={Colors.onSurfaceVariant}
          value={routeName}
          onChangeText={value => {
            setRouteName(value);
            resetGeneratedPreview();
          }}
        />

        <View style={styles.routeTypeSelector}>
          {ROUTE_TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.routeTypeBtn, routeType === option.value && styles.routeTypeBtnActive]}
              onPress={() => handleRouteTypeChange(option.value)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.routeTypeText,
                  routeType === option.value && styles.routeTypeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedRouteType?.note ? (
          <Text style={styles.routeTypeNote}>{selectedRouteType.note}</Text>
        ) : null}

        <View style={styles.modeSelector}>
          {(['START', 'END', 'CHECKPOINT'] as const)
            .filter(mode => routeType !== 'LOOP' || mode !== 'END')
            .map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, pickerMode === mode && styles.modeBtnActive]}
                onPress={() => setPickerMode(mode)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, pickerMode === mode && styles.modeBtnTextActive]}>
                  {mode === 'START'
                    ? 'Select Start'
                    : mode === 'END'
                      ? 'Select End'
                      : 'Add Checkpoint'}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.pointSummary}>
          {renderPointSummary('Start not selected', startPoint, Colors.successGreen)}
          {routeType === 'LOOP'
            ? renderPointSummary('End is automatically start', startPoint, Colors.successGreen)
            : renderPointSummary('End not selected', endPoint, Colors.error)}
          <View style={styles.pointSummaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.pointSummaryText}>{checkpoints.length} checkpoints</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>{activePoints.length} points</Text>
          <Text style={styles.statText}>{distanceKm.toFixed(2)} km</Text>
          <Text style={styles.statText}>{estimatedDurationMin} min</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.generateBtn,
            (!canGenerateRoute || isGenerating) && styles.generateBtnDisabled,
          ]}
          onPress={handleGenerateRoute}
          activeOpacity={0.85}
          disabled={!canGenerateRoute || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Ionicons name="navigate" size={18} color={Colors.onPrimary} />
          )}
          <Text style={styles.generateBtnText}>
            {isGenerating
              ? 'Generating...'
              : generatedRoute
                ? 'Regenerate Route'
                : 'Generate Route'}
          </Text>
        </TouchableOpacity>

        {generatedRoute && (
          <TouchableOpacity
            style={styles.useRouteBtn}
            onPress={handleUseGeneratedRoute}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
            <Text style={styles.useRouteBtnText}>Use This Route</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleUndo}
            disabled={(points.length === 0 && checkpoints.length === 0) || isSaving || isGenerating}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-undo-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleClear}
            disabled={activePoints.length === 0 || isSaving || isGenerating}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.secondaryBtnText, { color: Colors.error }]}>Clear</Text>
          </TouchableOpacity>
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
    height: 58,
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: Colors.surfaceWhite,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    zIndex: 2,
  },
  searchInputWrap: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    backgroundColor: Colors.surfaceContainerLowest,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing[2],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  searchResults: {
    maxHeight: 280,
    marginTop: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceWhite,
  },
  searchResultItem: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    gap: Spacing[2],
  },
  searchResultTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  searchResultSubtitle: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  searchActionRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  searchActionBtn: {
    minHeight: 30,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  searchActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  searchStateText: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  markerText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.surfaceWhite,
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  startEndMarker: {
    backgroundColor: Colors.successGreen,
  },
  turnaroundMarker: {
    backgroundColor: Colors.warningAmber,
  },
  startEndMarkerText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.surfaceWhite,
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
  startEndPinTip: {
    backgroundColor: Colors.successGreen,
  },
  turnaroundPinTip: {
    backgroundColor: Colors.warningAmber,
  },
  checkpointMarker: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  checkpointText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.surfaceWhite,
  },
  panel: {
    backgroundColor: Colors.surfaceWhite,
    padding: Spacing[4],
    gap: Spacing[3],
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...(Shadows.lg as object),
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  routeTypeSelector: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  routeTypeBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
  },
  routeTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  routeTypeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  routeTypeTextActive: {
    color: Colors.primary,
  },
  routeTypeNote: {
    marginTop: -Spacing[1],
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  modeBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
  },
  modeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  modeBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modeBtnTextActive: {
    color: Colors.primary,
  },
  pointSummary: {
    gap: Spacing[2],
  },
  pointSummaryItem: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pointSummaryText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  generateBtn: {
    minHeight: 48,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
  },
  generateBtnDisabled: {
    opacity: 0.55,
  },
  generateBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  useRouteBtn: {
    minHeight: 48,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.successGreen,
  },
  useRouteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
  },
  secondaryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
});
