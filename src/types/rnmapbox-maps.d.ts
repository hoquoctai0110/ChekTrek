declare module '@rnmapbox/maps' {
  import React from 'react';
  import { ViewStyle } from 'react-native';

  type Coordinate = [number, number];

  interface MapPressEvent {
    geometry?: {
      coordinates?: Coordinate;
    };
  }

  interface CameraRef {
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
  }

  interface MapViewProps {
    style?: ViewStyle;
    onPress?: (event: MapPressEvent) => void;
    onCameraChanged?: (event: {
      properties?: {
        center?: Coordinate;
      };
    }) => void;
    zoomEnabled?: boolean;
    scrollEnabled?: boolean;
    pitchEnabled?: boolean;
    rotateEnabled?: boolean;
    children?: React.ReactNode;
  }

  interface CameraProps {
    zoomLevel?: number;
    centerCoordinate?: Coordinate;
    animationDuration?: number;
  }

  interface MapboxModule {
    setAccessToken: (token: string) => void;
    MapView: React.ComponentType<MapViewProps>;
    Camera: React.ForwardRefExoticComponent<CameraProps & React.RefAttributes<CameraRef>>;
    ShapeSource: React.ComponentType<{
      id: string;
      shape: object;
      children?: React.ReactNode;
    }>;
    LineLayer: React.ComponentType<{
      id: string;
      style?: object;
    }>;
    PointAnnotation: React.ComponentType<{
      id: string;
      coordinate: Coordinate;
      children?: React.ReactNode;
    }>;
    UserLocation: React.ComponentType<{
      visible?: boolean;
    }>;
  }

  const Mapbox: MapboxModule;
  export default Mapbox;
}
