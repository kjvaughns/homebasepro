import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, errorResponse, successResponse, handleCorsPrefilight } from '../_shared/http.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const APP_URL = Deno.env.get('APP_URL') || 'https://homebaseproapp.com';

serve(async (req) => {
  const corsRes = handleCorsPrefilight(req);
  if (corsRes) return corsRes;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const provider = url.searchParams.get('provider');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initiate OAuth flow
    if (action === 'connect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !user) {
        return errorResponse('UNAUTHORIZED', 'Invalid auth token', 401);
      }

      // Get user's organization
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) {
        return errorResponse('NO_ORG', 'Organization not found', 404);
      }

      const redirectUri = `${APP_URL}/api/calendar-auth`;
      const stateData = JSON.stringify({ userId: user.id, orgId: org.id });
      const encodedState = btoa(stateData);

      if (provider === 'google') {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID || '');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', encodedState);

        return successResponse({ authUrl: authUrl.toString() });
      } else if (provider === 'microsoft') {
        const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        authUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID || '');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'Calendars.ReadWrite offline_access');
        authUrl.searchParams.set('state', encodedState);

        return successResponse({ authUrl: authUrl.toString() });
      }

      return errorResponse('INVALID_PROVIDER', 'Provider must be google or microsoft', 400);
    }

    // Handle OAuth callback
    if (code && state) {
      const stateData = JSON.parse(atob(state));
      const { userId, orgId } = stateData;

      const redirectUri = `${APP_URL}/api/calendar-auth`;
      let tokens;
      let calendarList;
      let calendarProvider = provider || 'google';

      if (calendarProvider === 'google' || !provider) {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID || '',
            client_secret: GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        tokens = await tokenResponse.json();

        // Get calendar list
        const calResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        calendarList = await calResponse.json();
        calendarProvider = 'google';
      } else if (calendarProvider === 'microsoft') {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: MICROSOFT_CLIENT_ID || '',
            client_secret: MICROSOFT_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        tokens = await tokenResponse.json();

        // Get calendar list
        const calResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        calendarList = await calResponse.json();
      }

      // Use primary calendar
      const primaryCalendar = calendarProvider === 'google' 
        ? calendarList.items?.find((cal: any) => cal.primary)
        : calendarList.value?.[0];

      // Store integration
      await supabase.from('calendar_integrations').upsert({
        organization_id: orgId,
        provider: calendarProvider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        calendar_id: primaryCalendar?.id,
        calendar_name: primaryCalendar?.summary || primaryCalendar?.name || 'Primary Calendar',
        sync_enabled: true,
        status: 'active',
      }, {
        onConflict: 'organization_id,provider',
      });

      // Redirect back to app settings
      return new Response(null, {
        status: 302,
        headers: {
          ...CORS_HEADERS,
          Location: `${APP_URL}/provider/settings?calendar=success`,
        },
      });
    }

    return errorResponse('INVALID_REQUEST', 'Missing required parameters', 400);
  } catch (error: any) {
    console.error('Calendar auth error:', error);
    return errorResponse('AUTH_ERROR', error.message, 500);
  }
});
