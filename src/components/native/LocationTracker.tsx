import { useEffect, useRef } from 'react';
import { useDespia } from '@/hooks/useDespia';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LocationTrackerProps {
  serviceCallId: string;
  isActive: boolean;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function LocationTracker({ serviceCallId, isActive, onLocationUpdate }: LocationTrackerProps) {
  const { enableBackgroundLocation, triggerHaptic } = useDespia();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Clean up tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Enable background location tracking
    enableBackgroundLocation();
    triggerHaptic('light');

    // Start tracking location
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Save to database
          try {
            const { error } = await supabase
              .from('service_call_location_history')
              .insert({
                service_call_id: serviceCallId,
                latitude,
                longitude,
                accuracy: accuracy || null,
                timestamp: new Date().toISOString(),
              });

            if (error) throw error;

            // Notify parent component
            onLocationUpdate?.(latitude, longitude);
          } catch (error) {
            console.error('Failed to save location:', error);
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
          toast.error('Location tracking unavailable');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [serviceCallId, isActive, enableBackgroundLocation, triggerHaptic, onLocationUpdate]);

  return null;
}
