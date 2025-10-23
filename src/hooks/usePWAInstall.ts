import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstall: () => void;
}

const DISMISS_KEY = 'homebase-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOWN_KEY = 'homebase-install-shown'; // Permanent flag - shown once per device

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(standalone || navigatorStandalone);
    };

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    // Check if dismissed recently
    const checkDismissed = () => {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        if (Date.now() - dismissedTime < DISMISS_DURATION) {
          return true;
        }
        localStorage.removeItem(DISMISS_KEY);
      }
      return false;
    };

    // Check if already shown once on this device
    const checkAlreadyShown = () => {
      return localStorage.getItem(SHOWN_KEY) === 'true';
    };

    checkInstalled();
    checkIOS();

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      if (!checkDismissed() && !isInstalled && !checkAlreadyShown()) {
        setCanInstall(true);
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show install prompt if not installed, not dismissed, and not already shown
    if (isIOS && !isInstalled && !checkDismissed() && !checkAlreadyShown()) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isIOS]);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // For iOS, we can't programmatically prompt
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  };

  const dismissInstall = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    localStorage.setItem(SHOWN_KEY, 'true'); // Mark as shown permanently
    setCanInstall(false);
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    promptInstall,
    dismissInstall
  };
}
