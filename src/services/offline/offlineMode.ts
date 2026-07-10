let OFFLINE_MODE = false;

export const offlineMode = {
  isEnabled: (): boolean => OFFLINE_MODE,
  setEnabled: (enabled: boolean): void => {
    OFFLINE_MODE = enabled;
  },
};
