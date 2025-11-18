import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting trial status check...');

    // Find all users whose trial has expired
    const { data: expiredTrials, error: queryError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, trial_ends_at, user_type')
      .eq('user_type', 'provider')
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', new Date().toISOString());

    if (queryError) {
      console.error('Error querying expired trials:', queryError);
      throw queryError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log('No expired trials found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired trials',
          checked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredTrials.length} expired trials`);

    // For each expired trial, check if they have an active subscription
    const results = [];
    for (const profile of expiredTrials) {
      // Check if user has upgraded
      const { data: org } = await supabase
        .from('organizations')
        .select('plan')
        .eq('owner_id', profile.user_id)
        .single();

      // If they have a paid plan, clear trial dates
      if (org && org.plan && org.plan !== 'free') {
        await supabase
          .from('profiles')
          .update({ 
            trial_ends_at: null,
            trial_started_at: null 
          })
          .eq('id', profile.id);

        results.push({
          profile_id: profile.id,
          action: 'cleared_trial_dates',
          reason: 'User upgraded',
        });
        continue;
      }

      // Check if we've already sent the trial end email
      const { data: reminder } = await supabase
        .from('trial_reminders_sent')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('reminder_type', 'trial_ended')
        .single();

      if (!reminder) {
        // Send trial ended email
        try {
          await supabase.functions.invoke('send-trial-reminders', {
            body: {
              userId: profile.user_id,
              profileId: profile.id,
              reminderType: 'trial_ended',
              fullName: profile.full_name,
            }
          });

          // Record that we sent it
          await supabase
            .from('trial_reminders_sent')
            .insert({
              user_id: profile.user_id,
              reminder_type: 'trial_ended',
            });

          results.push({
            profile_id: profile.id,
            action: 'sent_trial_ended_email',
          });
        } catch (emailError) {
          console.error('Error sending trial ended email:', emailError);
          results.push({
            profile_id: profile.id,
            action: 'error',
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
          });
        }
      } else {
        results.push({
          profile_id: profile.id,
          action: 'already_notified',
        });
      }
    }

    console.log('Trial check complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: expiredTrials.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-trial-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
