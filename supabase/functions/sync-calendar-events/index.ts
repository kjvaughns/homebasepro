import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, errorResponse, successResponse, handleCorsPrefilight } from '../_shared/http.ts';

serve(async (req) => {
  const corsRes = handleCorsPrefilight(req);
  if (corsRes) return corsRes;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active calendar integrations
    const { data: integrations, error: intError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('sync_enabled', true)
      .eq('status', 'active')
      .in('sync_direction', ['import_only', 'bidirectional']);

    if (intError) {
      console.error('Error fetching integrations:', intError);
      return errorResponse('DB_ERROR', intError.message, 500);
    }

    if (!integrations || integrations.length === 0) {
      return successResponse({ message: 'No active integrations to sync' });
    }

    const results = [];

    for (const integration of integrations) {
      const logId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      try {
        let events;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90); // Sync 90 days ahead

        if (integration.provider === 'google') {
          events = await syncGoogleCalendar(integration, now, futureDate);
        } else if (integration.provider === 'microsoft') {
          events = await syncMicrosoftCalendar(integration, now, futureDate);
        }

        // Create blocked bookings for external events
        let synced = 0;
        let failed = 0;

        for (const event of events || []) {
          try {
            // Check if booking already exists
            const { data: existing } = await supabase
              .from('bookings')
              .select('id')
              .eq('external_calendar_event_id', event.id)
              .maybeSingle();

            if (!existing) {
              // Create blocked booking
              await supabase.from('bookings').insert({
                provider_org_id: integration.organization_id,
                homeowner_profile_id: '00000000-0000-0000-0000-000000000000', // System user
                service_name: event.summary || 'Blocked Time',
                address: 'External Calendar Event',
                date_time_start: event.start,
                date_time_end: event.end,
                status: 'confirmed',
                is_calendar_block: true,
                external_calendar_event_id: event.id,
                calendar_sync_status: 'synced',
                notes: `Synced from ${integration.provider} calendar: ${integration.calendar_name}`,
              });

              synced++;
            }
          } catch (eventError: any) {
            console.error(`Failed to sync event ${event.id}:`, eventError);
            failed++;
          }
        }

        // Update integration last sync time
        await supabase
          .from('calendar_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);

        // Log sync result
        await supabase.from('calendar_sync_logs').insert({
          id: logId,
          integration_id: integration.id,
          sync_type: 'import',
          status: failed === 0 ? 'success' : 'partial',
          events_synced: synced,
          events_failed: failed,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });

        results.push({
          organizationId: integration.organization_id,
          provider: integration.provider,
          synced,
          failed,
        });
      } catch (intError: any) {
        console.error(`Error syncing ${integration.provider} for org ${integration.organization_id}:`, intError);

        await supabase.from('calendar_sync_logs').insert({
          id: logId,
          integration_id: integration.id,
          sync_type: 'import',
          status: 'failed',
          events_synced: 0,
          events_failed: 0,
          error_details: { message: intError.message },
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });

        results.push({
          organizationId: integration.organization_id,
          provider: integration.provider,
          error: intError.message,
        });
      }
    }

    return successResponse({
      message: 'Calendar sync complete',
      results,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return errorResponse('SYNC_ERROR', error.message, 500);
  }
});

async function syncGoogleCalendar(integration: any, startDate: Date, endDate: Date) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events?` +
    new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    }),
    {
      headers: { Authorization: `Bearer ${integration.access_token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items?.map((event: any) => ({
    id: event.id,
    summary: event.summary,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
  })) || [];
}

async function syncMicrosoftCalendar(integration: any, startDate: Date, endDate: Date) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${integration.calendar_id}/events?` +
    new URLSearchParams({
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    }),
    {
      headers: { Authorization: `Bearer ${integration.access_token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.value?.map((event: any) => ({
    id: event.id,
    summary: event.subject,
    start: event.start.dateTime,
    end: event.end.dateTime,
  })) || [];
}
