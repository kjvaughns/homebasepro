import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { bookingId, status } = await req.json();

    console.log('Sending status update for booking:', bookingId, 'status:', status);

    // Get booking details with client info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        clients!inner(name, email, phone, homeowner_profile_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Booking not found');
    }

    // Determine message based on status
    let message = '';
    let subject = '';
    
    switch (status) {
      case 'in_progress':
      case 'started':
        message = `Hi ${booking.clients.name}! 👋\n\nWe're on the way! Your technician will arrive shortly for your ${booking.service_name} service.\n\nService Address: ${booking.address}`;
        subject = 'Your service is starting soon';
        break;
      case 'completed':
        message = `Hi ${booking.clients.name}! ✅\n\nYour ${booking.service_name} service has been completed! Thank you for choosing us.\n\nIf you have any questions or concerns, please don't hesitate to reach out.`;
        subject = 'Service completed';
        break;
      default:
        message = `Status update for your ${booking.service_name} service: ${status}`;
        subject = 'Service status update';
    }

    // Send notification via push notification if available
    const { data: pushSubs } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', booking.clients.homeowner_profile_id);

    if (pushSubs && pushSubs.length > 0) {
      console.log(`Sending push notification to ${pushSubs.length} devices`);
      // Push notification would be sent here via web-push
      // For now, we'll just log it
    }

    // Log the notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: booking.clients.homeowner_profile_id,
        title: subject,
        body: message,
        type: 'booking_status',
        data: { booking_id: bookingId, status }
      });

    console.log('Status update notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status update sent to client' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in send-status-update:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
