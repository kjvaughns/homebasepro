import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { profile_id, credits_to_issue } = await req.json();

    if (!profile_id || !credits_to_issue) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get profile info
    const { data: profile } = await supabaseClient
      .from('referral_profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Issue credits
    const creditsData = [];
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    for (let i = 0; i < credits_to_issue; i++) {
      creditsData.push({
        profile_id: profile.id,
        role: profile.role,
        reward_type: 'service_credit',
        amount: 5000, // $50 in cents
        status: 'issued',
        expires_at: oneYearFromNow.toISOString(),
        meta: {
          issued_by_admin: user.id,
          auto_issued: false,
          issued_at: new Date().toISOString()
        }
      });
    }

    const { error: insertError } = await supabaseClient
      .from('rewards_ledger')
      .insert(creditsData);

    if (insertError) {
      console.error('Error inserting credits:', insertError);
      throw insertError;
    }

    // Log admin action
    await supabaseClient
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'issue_referral_reward',
        table_name: 'rewards_ledger',
        record_id: profile.id,
        details: {
          profile_id,
          referral_code: profile.referral_code,
          credits_issued: credits_to_issue,
          total_amount: credits_to_issue * 50
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        credits_issued: credits_to_issue,
        total_amount: credits_to_issue * 50,
        expires_at: oneYearFromNow.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in issue-referral-reward:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
