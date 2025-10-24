import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, errorResponse, successResponse, handleCorsPrefilight } from '../_shared/http.ts';

serve(async (req) => {
  const corsRes = handleCorsPrefilight(req);
  if (corsRes) return corsRes;

  try {
    const { bookingId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, organizations(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return errorResponse('BOOKING_NOT_FOUND', 'Booking not found', 404);
    }

    // Skip if it's a calendar block or already synced
    if (booking.is_calendar_block || booking.calendar_sync_status === 'synced') {
      return successResponse({ message: 'Booking already synced or is a calendar block' });
    }

    // Get calendar integrations for this organization
    const { data: integrations, error: intError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('organization_id', booking.provider_org_id)
      .eq('sync_enabled', true)
      .eq('status', 'active')
      .in('sync_direction', ['export_only', 'bidirectional']);

    if (intError || !integrations || integrations.length === 0) {
      console.log('No export integrations found for organization');
      return successResponse({ message: 'No export integrations configured' });
    }

    const results = [];

    for (const integration of integrations) {
      try {
        let externalEventId;

        if (integration.provider === 'google') {
          externalEventId = await createGoogleEvent(integration, booking);
        } else if (integration.provider === 'microsoft') {
          externalEventId = await createMicrosoftEvent(integration, booking);
        }

        // Update booking with external event ID
        await supabase
          .from('bookings')
          .update({
            external_calendar_event_id: externalEventId,
            calendar_sync_status: 'synced',
          })
          .eq('id', bookingId);

        results.push({
          provider: integration.provider,
          success: true,
          eventId: externalEventId,
        });
      } catch (providerError: any) {
        console.error(`Failed to create event in ${integration.provider}:`, providerError);
        results.push({
          provider: integration.provider,
          success: false,
          error: providerError.message,
        });

        // Update booking with failed status
        await supabase
          .from('bookings')
          .update({ calendar_sync_status: 'failed' })
          .eq('id', bookingId);
      }
    }

    return successResponse({
      message: 'Calendar event creation attempted',
      results,
    });
  } catch (error: any) {
    console.error('Create calendar event error:', error);
    return errorResponse('CREATE_ERROR', error.message, 500);
  }
});

async function createGoogleEvent(integration: any, booking: any) {
  const event = {
    summary: `${booking.service_name} - HomeBase`,
    description: booking.notes || 'Booking from HomeBase',
    location: booking.address,
    start: {
      dateTime: booking.date_time_start,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: booking.date_time_end,
      timeZone: 'America/New_York',
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

async function createMicrosoftEvent(integration: any, booking: any) {
  const event = {
    subject: `${booking.service_name} - HomeBase`,
    body: {
      contentType: 'text',
      content: booking.notes || 'Booking from HomeBase',
    },
    location: {
      displayName: booking.address,
    },
    start: {
      dateTime: booking.date_time_start,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: booking.date_time_end,
      timeZone: 'America/New_York',
    },
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${integration.calendar_id}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}
