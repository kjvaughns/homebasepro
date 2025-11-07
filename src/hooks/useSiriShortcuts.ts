import { useEffect } from 'react';
import despia from 'despia-native';

interface Intent {
  action: string;
  params?: Record<string, any>;
}

export function useSiriShortcuts() {
  const registerShortcut = async (
    phrase: string,
    action: string,
    params?: Record<string, any>
  ) => {
    try {
      const paramsString = params ? `&params=${encodeURIComponent(JSON.stringify(params))}` : '';
      await despia(`siri://register?phrase=${encodeURIComponent(phrase)}&action=${encodeURIComponent(action)}${paramsString}`);
      return true;
    } catch (error) {
      console.warn('Register shortcut not available:', error);
      return false;
    }
  };

  const handleShortcutIntent = (callback: (intent: Intent) => void) => {
    const handler = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('siri-intent' as any, handler);
    return () => window.removeEventListener('siri-intent' as any, handler);
  };

  const respond = async (message: string) => {
    try {
      await despia(`siri://respond?message=${encodeURIComponent(message)}`);
    } catch (error) {
      console.warn('Siri respond not available:', error);
    }
  };

  const donateInteraction = async (action: string, title: string) => {
    try {
      // Donate interaction for Siri Suggestions
      await despia(`siri://donate?action=${encodeURIComponent(action)}&title=${encodeURIComponent(title)}`);
    } catch (error) {
      console.warn('Donate interaction not available:', error);
    }
  };

  return {
    registerShortcut,
    handleShortcutIntent,
    respond,
    donateInteraction
  };
}

// Core shortcuts registration
export function useSiriShortcutsInit() {
  const { registerShortcut } = useSiriShortcuts();

  useEffect(() => {
    const registerCoreShortcuts = async () => {
      // Job management
      await registerShortcut('Start next job', 'start-next-job');
      await registerShortcut('Mark job complete', 'complete-current-job');
      await registerShortcut('Navigate to next job', 'navigate-next-job');

      // Client communication
      await registerShortcut('Send payment link', 'send-payment-link');
      await registerShortcut('Send estimate', 'send-estimate');
      await registerShortcut('Call client', 'call-client');

      // Quick actions
      await registerShortcut('Record expense', 'record-expense');
      await registerShortcut('Clock in', 'clock-in');
      await registerShortcut('Check schedule', 'view-schedule');
    };

    registerCoreShortcuts();
  }, []);
}
