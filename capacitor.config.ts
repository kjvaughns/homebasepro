import { CapacitorConfig } from '@capacitor/cli';

const LOVABLE_URL = 'https://5e22f02d-088e-46c5-ac69-681bd20fd9bf.lovableproject.com';

const config: CapacitorConfig = {
  appId: 'app.lovable.homebase',
  appName: 'HomeBase Pro',
  webDir: 'dist',
  server: process.env.NODE_ENV === 'development'
    ? { url: 'http://localhost:8080', cleartext: true }
    : { url: LOVABLE_URL, cleartext: false },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    allowsBackForwardNavigationGestures: true,
    scrollEnabled: true,
  },
  
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true, // disable in production
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#ffffff',
      showSpinner: false,
    }
  }
};

export default config;
