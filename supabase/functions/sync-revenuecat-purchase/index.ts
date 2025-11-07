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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { purchaseData } = await req.json();

    // Map RevenueCat product ID to plan tier
    const planMapping: Record<string, string> = {
      'homebase_beta_monthly': 'beta',
      'homebase_growth_monthly': 'growth',
      'homebase_pro_monthly': 'pro',
      'homebase_scale_monthly': 'scale'
    };

    const plan = planMapping[purchaseData.productIdentifier] || 'free';

    // Get user's organization
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Update organization plan
    await supabaseClient
      .from('organizations')
      .update({
        plan,
        updated_at: new Date().toISOString()
      })
      .eq('id', org.id);

    // Update subscription record
    await supabaseClient
      .from('homeowner_subscriptions')
      .update({
        revenuecat_customer_id: purchaseData.customerId,
        platform: purchaseData.store === 'app_store' ? 'app_store' : 'play_store',
        entitlements: purchaseData.entitlements || {},
        status: 'active'
      })
      .eq('provider_org_id', org.id);

    return new Response(
      JSON.stringify({ success: true, plan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync RevenueCat purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
