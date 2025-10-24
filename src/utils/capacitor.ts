import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export async function initializeNativeUI() {
  if (!isNative) return;

  // Status bar styling
  if (Capacitor.isPluginAvailable('StatusBar')) {
    await StatusBar.setStyle({ style: Style.Light });
    
    // Android status bar color
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#22c55e' });
    }
  }

  // Hide splash screen after first paint
  if (Capacitor.isPluginAvailable('SplashScreen')) {
    setTimeout(() => SplashScreen.hide(), 300);
  }

  // Android back button handling
  if (platform === 'android' && Capacitor.isPluginAvailable('App')) {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }
}
