import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

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
    const stripeSecretKey = Deno.env.get('stripe_secret_key');

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ 
        error: 'Stripe not configured',
        balance: { available: 0, pending: 0, currency: 'usd' }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user and organization
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id')
      .eq('owner_id', user.id)
      .single();

    if (!org?.stripe_account_id) {
      return new Response(JSON.stringify({ 
        error: 'Stripe account not connected',
        balance: { available: 0, pending: 0, currency: 'usd' }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: org.stripe_account_id,
    });

    const availableAmount = balance.available.reduce((sum: number, bal: any) => sum + bal.amount, 0);
    const pendingAmount = balance.pending.reduce((sum: number, bal: any) => sum + bal.amount, 0);

    return new Response(JSON.stringify({ 
      balance: {
        available: availableAmount,
        pending: pendingAmount,
        currency: balance.available[0]?.currency || 'usd'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-balance:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      balance: { available: 0, pending: 0, currency: 'usd' }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
