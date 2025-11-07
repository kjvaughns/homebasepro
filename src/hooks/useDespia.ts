import { useCallback } from 'react';
import despia from 'despia-native';

export type HapticType = 'light' | 'heavy' | 'success' | 'warning' | 'error';

export function useDespia() {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    try {
      despia(`${type}haptic://`);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }, []);

  const showSpinner = useCallback(() => {
    try {
      despia('spinneron://');
    } catch (error) {
      console.warn('Native spinner not available:', error);
    }
  }, []);

  const hideSpinner = useCallback(() => {
    try {
      despia('spinneroff://');
    } catch (error) {
      console.warn('Native spinner not available:', error);
    }
  }, []);

  const authenticateBiometric = useCallback(async (): Promise<boolean> => {
    try {
      await despia('bioauth://');
      return true;
    } catch (error) {
      console.warn('Biometric auth not available:', error);
      return false;
    }
  }, []);

  const shareContent = useCallback((message: string, url?: string) => {
    try {
      const shareUrl = url ? `&url=${encodeURIComponent(url)}` : '';
      despia(`shareapp://message?=${encodeURIComponent(message)}${shareUrl}`);
    } catch (error) {
      console.warn('Native sharing not available:', error);
    }
  }, []);

  const getDeviceId = useCallback(async (): Promise<string | null> => {
    try {
      const result = await despia('get-uuid://', ['uuid']);
      return result?.uuid || null;
    } catch (error) {
      console.warn('Device ID not available:', error);
      return null;
    }
  }, []);

  const getAppVersion = useCallback(async () => {
    try {
      return await despia('getappversion://', ['versionNumber', 'bundleNumber']);
    } catch (error) {
      console.warn('App version not available:', error);
      return null;
    }
  }, []);

  const takeScreenshot = useCallback(() => {
    try {
      despia('takescreenshot://');
    } catch (error) {
      console.warn('Screenshot not available:', error);
    }
  }, []);

  const saveImage = useCallback((url: string) => {
    try {
      despia(`savethisimage://?url=${encodeURIComponent(url)}`);
    } catch (error) {
      console.warn('Save image not available:', error);
    }
  }, []);

  const requestContactsPermission = useCallback(async () => {
    try {
      await despia('requestcontactpermission://');
      return true;
    } catch (error) {
      console.warn('Contacts permission not available:', error);
      return false;
    }
  }, []);

  const readContacts = useCallback(async () => {
    try {
      const result = await despia('readcontacts://', ['contacts']);
      return result?.contacts || [];
    } catch (error) {
      console.warn('Read contacts not available:', error);
      return [];
    }
  }, []);

  const enableBackgroundLocation = useCallback(() => {
    try {
      despia('backgroundlocationon://');
    } catch (error) {
      console.warn('Background location not available:', error);
    }
  }, []);

  const setStatusBarColor = useCallback((r: number, g: number, b: number) => {
    try {
      despia(`statusbarcolor://{${r}, ${g}, ${b}}`);
    } catch (error) {
      console.warn('Status bar color not available:', error);
    }
  }, []);

  const enableFullScreen = useCallback((enable: boolean) => {
    try {
      despia(`hidebars://${enable ? 'on' : 'off'}`);
    } catch (error) {
      console.warn('Full screen mode not available:', error);
    }
  }, []);

  return {
    triggerHaptic,
    showSpinner,
    hideSpinner,
    authenticateBiometric,
    shareContent,
    getDeviceId,
    getAppVersion,
    takeScreenshot,
    saveImage,
    requestContactsPermission,
    readContacts,
    enableBackgroundLocation,
    setStatusBarColor,
    enableFullScreen,
  };
}
