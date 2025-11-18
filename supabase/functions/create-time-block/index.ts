import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { start_at, end_at, note } = await req.json();

    if (!start_at || !end_at) {
      throw new Error('Start and end times are required');
    }

    console.log('🚫 Creating time block:', { start_at, end_at });

    // Get current user's organization
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError) throw orgError;
    if (!org) throw new Error('Organization not found');

    // Create blocked time slot in service_requests
    const { data: block, error: blockError } = await supabaseClient
      .from('service_requests')
      .insert({
        provider_org_id: org.id,
        service_type: 'Blocked Time',
        description: note || 'Time blocked off',
        status: 'blocked',
        type: 'block',
        window_start: start_at,
        window_end: end_at,
        urgency_level: 'routine',
        is_service_call: false
      })
      .select()
      .single();

    if (blockError) throw blockError;

    console.log('✅ Time block created successfully');

    return new Response(
      JSON.stringify({ success: true, block }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error creating time block:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});