import Mapbox from '@rnmapbox/maps';

let hasInitializedMapbox = false;

export const getMapboxAccessToken = (): string => {
  return process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
};

export const getMapboxTokenSource = (): 'process.env' | 'missing' =>
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ? 'process.env' : 'missing';

export const getMapboxConfigError = (): string | null => {
  const token = getMapboxAccessToken();
  if (!token) {
    return 'Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.';
  }

  return null;
};

export const logMapboxRenderAttempt = (screenName: string): void => {
  console.log(`[Mapbox] ${screenName} token configured:`, Boolean(getMapboxAccessToken()));
};

export const ensureMapboxConfigured = (): { isReady: boolean; error: string | null } => {
  const error = getMapboxConfigError();

  if (error) {
    return { isReady: false, error };
  }

  if (!hasInitializedMapbox) {
    Mapbox.setAccessToken(getMapboxAccessToken());
    hasInitializedMapbox = true;

    console.log('[Mapbox] token configured for runtime:', Boolean(getMapboxAccessToken()));
  }

  return { isReady: true, error: null };
};
