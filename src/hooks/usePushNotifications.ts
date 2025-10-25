import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { urlBase64ToUint8Array } from '@/utils/serviceWorker';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Auto-sync subscription to backend on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
      
      // If permission granted, ensure backend is synced
      if (Notification.permission === 'granted') {
        ensureBackendSync();
      }
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
          console.log('🔄 Push subscription changed, re-syncing...');
          ensureBackendSync();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Ensure browser subscription is saved to backend
  const ensureBackendSync = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // Not authenticated

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) return; // No browser subscription

      console.log('🔄 Syncing existing subscription to backend...');
      
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) return;

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey)))
        }
      };

      // Try to save with retry
      for (let attempt = 1; attempt <= 2; attempt++) {
        const { error } = await supabase.functions.invoke('subscribe-push', {
          body: subscriptionData
        });

        if (!error) {
          console.log('✅ Backend sync successful');
          return;
        }

        if (attempt === 1) {
          console.warn('⚠️ Backend sync failed, retrying in 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.error('❌ Backend sync failed after retry:', error);
        }
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
    }
  };

  const subscribe = async (): Promise<boolean> => {
    console.log('🔔 Starting push notification subscription flow');
    setLoading(true);

    try {
      // Step 1: Check browser capabilities
      console.log('🔍 Step 1: Checking browser capabilities');
      
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }
      console.log('✅ Notification API available');

      if (!('PushManager' in window)) {
        throw new Error('Push notifications not supported in this browser');
      }
      console.log('✅ PushManager API available');

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers not supported in this browser');
      }
      console.log('✅ Service Worker API available');

      if (!window.isSecureContext) {
        throw new Error('Push notifications require HTTPS');
      }
      console.log('✅ Secure context (HTTPS)');

      // Step 2: Check authentication
      console.log('🔍 Step 2: Checking authentication');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        toast({
          title: 'Authentication required',
          description: 'Please sign in to enable notifications',
          variant: 'destructive'
        });
        return false;
      }
      console.log('✅ User authenticated:', session.user.id);

      // Step 3: Check service worker status
      console.log('🔍 Step 3: Checking service worker status');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready:', registration.active?.scriptURL);

      // Step 4: Request notification permission
      console.log('🔍 Step 4: Requesting notification permission');
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('📋 Permission result:', result);

      if (result !== 'granted') {
        console.warn('⚠️ Notification permission denied by user');
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive'
        });
        return false;
      }
      console.log('✅ Notification permission granted');

      // Step 5: Get VAPID public key
      console.log('🔍 Step 5: Fetching VAPID public key from backend');
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        'get-vapid-public-key'
      );

      if (vapidError) {
        console.error('❌ Error fetching VAPID key:', vapidError);
        throw new Error(`Failed to get VAPID key: ${vapidError.message}`);
      }

      if (!vapidData?.publicKey) {
        console.error('❌ No public key in response:', vapidData);
        throw new Error('VAPID public key not found in response');
      }
      console.log('✅ VAPID public key received:', vapidData.publicKey.substring(0, 20) + '...');

      // Validate VAPID key format
      try {
        const vapidKeyBytes = urlBase64ToUint8Array(vapidData.publicKey);
        console.log('🔍 VAPID key length:', vapidKeyBytes.length, 'bytes');
        if (vapidKeyBytes.length !== 65) {
          throw new Error(`Invalid VAPID key length: ${vapidKeyBytes.length} bytes (expected 65)`);
        }
        console.log('✅ VAPID key validated');
      } catch (validationError) {
        console.error('❌ VAPID key validation failed:', validationError);
        throw new Error('Invalid VAPID public key format');
      }

      // Step 6: Clear any existing subscription (handles VAPID key changes and stale subs)
      console.log('🔍 Step 6: Checking for existing subscription');
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('⚠️ Found existing subscription, unsubscribing first to ensure fresh subscription');
        await existingSubscription.unsubscribe().catch((e) => console.warn('Unsubscribe failed:', e));
        console.log('✅ Old subscription cleared');
      }

      // Step 7: Subscribe to push manager
      console.log('🔍 Step 7: Subscribing to push manager');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as BufferSource
      });
      console.log('✅ Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Step 8: Send subscription to backend with retry
      console.log('🔍 Step 8: Sending subscription to backend');
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey)))
        }
      };
      console.log('📤 Subscription data prepared, sending to subscribe-push function');

      // Try with retry
      let subData, subError;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = await supabase.functions.invoke('subscribe-push', {
          body: subscriptionData
        });
        subData = result.data;
        subError = result.error;

        if (!subError) break;

        if (attempt === 1) {
          console.warn('⚠️ Backend save failed, retrying in 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (subError) {
        console.error('❌ Error from subscribe-push function:', subError);
        throw new Error(`Backend subscription failed: ${subError.message}`);
      }

      console.log('✅ Backend subscription response:', subData);
      console.log('🎉 Push notification subscription complete!');

      setIsSubscribed(true);
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive notifications from HomeBase'
      });
      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      
      toast({
        title: 'Failed to enable notifications',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from backend
        await supabase.functions.invoke('unsubscribe-push', {
          body: { endpoint: subscription.endpoint }
        });
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive notifications'
      });
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Failed to disable notifications',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  };
}
