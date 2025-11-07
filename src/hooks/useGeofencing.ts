import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import despia from 'despia-native';

interface GeofenceEvent {
  type: 'enter' | 'exit' | 'dwell';
  jobId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}

export function useGeofencing() {
  const [activeGeofences, setActiveGeofences] = useState<string[]>([]);

  const createGeofence = async (
    jobId: string,
    lat: number,
    lng: number,
    radiusMeters: number = 100
  ) => {
    try {
      // Store in database
      await supabase.from('service_call_geofences').insert({
        service_call_id: jobId,
        latitude: lat,
        longitude: lng,
        radius_meters: radiusMeters,
        is_active: true
      });

      // Register with native geofencing
      try {
        const params = new URLSearchParams({
          id: jobId,
          latitude: lat.toString(),
          longitude: lng.toString(),
          radius: radiusMeters.toString(),
          events: 'enter,exit,dwell'
        });
        await despia(`geofence://create?${params}`);
      } catch (error) {
        console.warn('Native geofencing not available:', error);
      }

      setActiveGeofences(prev => [...prev, jobId]);
      
      return true;
    } catch (error) {
      console.error('Create geofence error:', error);
      return false;
    }
  };

  const removeGeofence = async (jobId: string) => {
    try {
      // Deactivate in database
      await supabase
        .from('service_call_geofences')
        .update({ is_active: false })
        .eq('service_call_id', jobId);

      // Remove from native geofencing
      try {
        await despia(`geofence://remove?id=${jobId}`);
      } catch (error) {
        console.warn('Native geofencing not available:', error);
      }

      setActiveGeofences(prev => prev.filter(id => id !== jobId));
      
      return true;
    } catch (error) {
      console.error('Remove geofence error:', error);
      return false;
    }
  };

  const handleGeofenceEvent = async (event: GeofenceEvent) => {
    try {
      // Log event to database
      await supabase.from('service_call_location_history').insert({
        service_call_id: event.jobId,
        latitude: event.latitude,
        longitude: event.longitude,
        geofence_event: event.type,
        timestamp: event.timestamp
      });

      if (event.type === 'enter') {
        // Auto clock-in
        const { data: job } = await supabase
          .from('bookings')
          .select('*, homeowner_profile_id')
          .eq('id', event.jobId)
          .single();

        if (job) {
          await supabase.from('bookings').update({
            status: 'in_progress',
            started_at: new Date().toISOString()
          }).eq('id', event.jobId);

          try {
            despia('successhaptic://');
          } catch {}
          toast.success('Auto-clocked in - Job started');

          // Notify client
          await supabase.functions.invoke('send-onesignal-notification', {
            body: {
              userId: job.homeowner_profile_id,
              title: 'Provider Arrived',
              message: 'Your service provider is on site',
              data: { jobId: event.jobId }
            }
          });
        }
      }

      if (event.type === 'exit') {
        // Remind to complete job
        toast('Don\'t forget to mark job complete and take final photos');
      }

      return true;
    } catch (error) {
      console.error('Handle geofence event error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Listen for geofence events
    const handleGeofence = (event: CustomEvent) => {
      handleGeofenceEvent(event.detail);
    };

    window.addEventListener('geofence' as any, handleGeofence);
    return () => window.removeEventListener('geofence' as any, handleGeofence);
  }, []);

  return {
    createGeofence,
    removeGeofence,
    activeGeofences
  };
}
