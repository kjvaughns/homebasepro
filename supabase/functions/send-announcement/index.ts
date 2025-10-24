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

    const { title, body, target_audience, priority, expires_at, send_push } = await req.json();

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

    // Create notifications for all target users
    const notifications = profiles.map(profile => ({
      user_id: profile.user_id,
      profile_id: profile.id,
      type: 'announcement',
      title,
      body,
      action_url: null,
      metadata: { announcement_id: announcement.id, priority },
    }));

    const { error: notifError } = await serviceSupabase
      .from('notifications')
      .insert(notifications);

    if (notifError) throw notifError;

    // Optionally send push notifications
    if (send_push) {
      try {
        const userIds = profiles.map(p => p.user_id);
        await serviceSupabase.functions.invoke('send-push-notification', {
          body: {
            userIds,
            title: `📢 ${title}`,
            body,
            url: '/notifications',
          },
        });
      } catch (pushErr) {
        console.error('Failed to send push notifications:', pushErr);
      }
    }

    console.log(`✅ Announcement sent to ${profiles.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        announcement,
        recipients: profiles.length,
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
