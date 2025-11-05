import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, body, target_audience, priority, expires_at, send_push, send_email } = await req.json();
    
    console.log('📨 Received announcement request:', {
      title,
      target_audience,
      priority,
      send_push,
      send_email,
      send_push_type: typeof send_push,
      send_email_type: typeof send_email,
    });

    // Create announcement
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        target_audience,
        priority: priority || 'normal',
        created_by: user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (annError) throw annError;

    // Get target users
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = serviceSupabase.from('profiles').select('id, user_id, user_type');

    if (target_audience === 'providers') {
      query = query.eq('user_type', 'provider');
    } else if (target_audience === 'homeowners') {
      query = query.eq('user_type', 'homeowner');
    }

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) throw profilesError;

    // Dispatch notifications through centralized system
    const pushEnabled = send_push === true;
    const emailEnabled = send_email === true;
    
    console.log(`📬 Dispatching notifications to ${profiles.length} users via dispatch-notification...`);
    console.log(`📊 Channel settings: push=${pushEnabled}, email=${emailEnabled}`);
    
    let dispatched = 0;
    let failed = 0;
    
    for (const profile of profiles) {
      try {
        console.log('📤 Invoking dispatch for:', { 
          userId: profile.user_id, 
          role: profile.user_type, 
          pushEnabled, 
          emailEnabled 
        });
        
        const { error: dispatchError } = await serviceSupabase.functions.invoke('dispatch-notification', {
          body: {
            type: 'announcement',
            userId: profile.user_id,
            profileId: profile.id,
            role: profile.user_type,
            title,
            body,
            actionUrl: '/notifications',
            metadata: { announcement_id: announcement.id, priority },
            forceChannels: {
              inapp: true,  // Always show in-app
              push: pushEnabled,  // Based on admin toggle
              email: emailEnabled,  // Based on admin toggle
            },
          },
        });

        if (dispatchError) {
          console.error(`❌ Failed to dispatch for user ${profile.user_id}:`, dispatchError);
          failed++;
        } else {
          dispatched++;
        }
      } catch (err) {
        console.error(`❌ Exception dispatching for user ${profile.user_id}:`, err);
        failed++;
      }
    }
    
    console.log(`✅ Dispatch summary: ${dispatched} dispatched, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        announcement,
        recipients: profiles.length,
        dispatched,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Send announcement failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
