import { TourRoute } from '@services/api/routes.api';

export type Coordinate = [number, number];

export const DEFAULT_ROUTE_CENTER: Coordinate = [105.8342, 21.0278];

export const isFiniteCoordinate = (coordinate: unknown): coordinate is Coordinate =>
  Array.isArray(coordinate) &&
  coordinate.length >= 2 &&
  Number.isFinite(Number(coordinate[0])) &&
  Number.isFinite(Number(coordinate[1]));

export const normalizeCoordinatePair = (pair: Coordinate): Coordinate => {
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

export const decodePolylineData = (polylineData?: string): Coordinate[] => {
  const value = polylineData?.trim();
  if (!value) return [];

  if (value.startsWith('[')) {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isFiniteCoordinate).map(pair => normalizeCoordinatePair(pair));
  }

  return decodeStandardPolyline(value);
};

export const getRouteBounds = (coordinates: Coordinate[]) => {
  const longitudes = coordinates.map(coordinate => coordinate[0]);
  const latitudes = coordinates.map(coordinate => coordinate[1]);

  return {
    southWest: [Math.min(...longitudes), Math.min(...latitudes)] as Coordinate,
    northEast: [Math.max(...longitudes), Math.max(...latitudes)] as Coordinate,
  };
};

export const getRouteMidpoint = (coordinates: Coordinate[]): Coordinate => {
  const firstCoordinate = coordinates[0];
  const lastCoordinate = coordinates[coordinates.length - 1] ?? firstCoordinate;

  return [
    (firstCoordinate[0] + lastCoordinate[0]) / 2,
    (firstCoordinate[1] + lastCoordinate[1]) / 2,
  ];
};

export const getManualRouteZoom = (distanceKm?: number): number | undefined => {
  if (distanceKm === undefined || !Number.isFinite(distanceKm)) return undefined;
  if (distanceKm <= 1) return 17;
  if (distanceKm <= 3) return 15.5;
  return undefined;
};

export const getRouteFallbackCenter = (route?: TourRoute): Coordinate => {
  if (
    route?.startLongitude !== undefined &&
    route.startLatitude !== undefined &&
    Number.isFinite(Number(route.startLongitude)) &&
    Number.isFinite(Number(route.startLatitude))
  ) {
    return [Number(route.startLongitude), Number(route.startLatitude)];
  }

  return DEFAULT_ROUTE_CENTER;
};
