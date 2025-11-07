import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import despia from 'despia-native';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export function useOneSignal() {
  const initialize = async (userId: string) => {
    try {
      // Initialize OneSignal via Despia
      await despia('onesignal://init', {
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        userId
      });
    } catch (error) {
      console.warn('OneSignal initialization not available:', error);
    }
  };

  const subscribe = async (userId: string, topics: string[]) => {
    try {
      await despia('onesignal://subscribe', {
        userId,
        topics // ['new-requests', 'invoice-overdue', 'review-needed']
      });
    } catch (error) {
      console.warn('OneSignal subscribe not available:', error);
    }
  };

  const unsubscribe = async (topics: string[]) => {
    try {
      await despia('onesignal://unsubscribe', {
        topics
      });
    } catch (error) {
      console.warn('OneSignal unsubscribe not available:', error);
    }
  };

  const sendNotification = async (data: NotificationData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-onesignal-notification', {
        body: data
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  };

  const setUserId = async (userId: string) => {
    try {
      await despia('onesignal://setUserId', { userId });
    } catch (error) {
      console.warn('Set user ID not available:', error);
    }
  };

  const showInAppMessage = async (messageId: string) => {
    try {
      await despia('onesignal://showInAppMessage', { messageId });
    } catch (error) {
      console.warn('Show in-app message not available:', error);
    }
  };

  return {
    initialize,
    subscribe,
    unsubscribe,
    sendNotification,
    setUserId,
    showInAppMessage
  };
}

// Auto-initialize OneSignal for authenticated users
export function useOneSignalInit() {
  const { initialize, subscribe } = useOneSignal();

  useEffect(() => {
    const initOneSignal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await initialize(user.id);

      // Get user profile to determine topics
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();

      if (profile?.user_type === 'provider') {
        // Subscribe to provider topics
        await subscribe(user.id, [
          'new-requests',
          'invoice-overdue',
          'review-needed',
          'job-updates',
          'payouts'
        ]);
      }
    };

    initOneSignal();
  }, []);
}
