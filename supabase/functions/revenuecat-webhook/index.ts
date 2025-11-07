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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event = await req.json();

    console.log('RevenueCat webhook event:', event.type);

    // Handle different event types
    if (event.type === 'CANCELLATION') {
      // Handle subscription cancellation
      await supabaseClient
        .from('homeowner_subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('revenuecat_customer_id', event.app_user_id);

      console.log('Subscription canceled for user:', event.app_user_id);
    }

    if (event.type === 'RENEWAL') {
      // Handle subscription renewal
      await supabaseClient
        .from('homeowner_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('revenuecat_customer_id', event.app_user_id);

      console.log('Subscription renewed for user:', event.app_user_id);
    }

    if (event.type === 'UNCANCELLATION') {
      // Handle subscription reactivation
      await supabaseClient
        .from('homeowner_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('revenuecat_customer_id', event.app_user_id);

      console.log('Subscription reactivated for user:', event.app_user_id);
    }

    if (event.type === 'EXPIRATION') {
      // Handle subscription expiration
      await supabaseClient
        .from('homeowner_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('revenuecat_customer_id', event.app_user_id);

      console.log('Subscription expired for user:', event.app_user_id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
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
