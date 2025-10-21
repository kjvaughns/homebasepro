import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting appointment reminder check...');

    // Calculate 24 hours from now (with 1 hour buffer)
    const now = new Date();
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log('Looking for appointments between:', reminderStart, 'and', reminderEnd);

    // Get bookings starting in ~24 hours
    const { data: upcomingBookings, error } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        service_name,
        date_time_start,
        homeowner_profile_id,
        provider_org_id
      `)
      .eq('status', 'confirmed')
      .gte('date_time_start', reminderStart.toISOString())
      .lt('date_time_start', reminderEnd.toISOString());

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    console.log('Found bookings:', upcomingBookings?.length || 0);

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No upcoming appointments in the next 24 hours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    let failed = 0;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Send reminder to each homeowner
    for (const booking of upcomingBookings) {
      // Get user_id and provider name
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('id', booking.homeowner_profile_id)
        .single();

      const { data: org } = await supabaseClient
        .from('organizations')
        .select('name')
        .eq('id', booking.provider_org_id)
        .single();

      if (!profile?.user_id) {
        console.log('Skipping booking - no user_id:', booking.id);
        failed++;
        continue;
      }

      const appointmentTime = new Date(booking.date_time_start);
      const timeString = appointmentTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const providerName = org?.name || 'your service provider';

      try {
        console.log(`Sending reminder for booking ${booking.id} to user ${profile.user_id}`);
        
        const notificationRes = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
              userIds: [profile.user_id],
              title: '⏰ Appointment Reminder',
              body: `Your ${booking.service_name} with ${providerName} is tomorrow at ${timeString}`,
              url: `/homeowner/appointments/${booking.id}`,
              icon: '/homebase-logo.png'
            })
          }
        );

        if (notificationRes.ok) {
          sent++;
          console.log(`Successfully sent reminder for booking ${booking.id}`);
        } else {
          failed++;
          console.error(`Failed to send reminder for booking ${booking.id}:`, await notificationRes.text());
        }
      } catch (error) {
        failed++;
        console.error(`Error sending reminder for booking ${booking.id}:`, error);
      }
    }

    console.log(`Appointment reminders complete. Sent: ${sent}, Failed: ${failed}, Total: ${upcomingBookings.length}`);

    return new Response(
      JSON.stringify({ sent, failed, total: upcomingBookings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-appointment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
