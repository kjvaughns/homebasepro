import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET') || Deno.env.get('stripe_secret_key');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET not configured');
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, code: 'AUTH_FAILED', message: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profileId, email } = await req.json();

    // Get user's email if not provided
    const userEmail = email || user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ ok: false, code: 'EMAIL_REQUIRED', message: 'Email address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if customer record exists
    let { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let stripeCustomerId = customer?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      try {
        const stripeCustomer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            user_id: user.id,
            profile_id: profileId || '',
          },
        });

        stripeCustomerId = stripeCustomer.id;

        // Save to database
        await supabase.from('customers').upsert({
          user_id: user.id,
          profile_id: profileId,
          stripe_customer_id: stripeCustomerId,
        });

        console.log('Created Stripe customer:', stripeCustomerId);
      } catch (error: any) {
        await logError(supabase, null, 'create-customer-setup-intent:create-customer', 
          { profileId, email: userEmail }, error.message, error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'CUSTOMER_CREATE_FAILED', 
            message: 'Failed to create customer account' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create SetupIntent for saving payment method
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: {
          user_id: user.id,
          profile_id: profileId || '',
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          clientSecret: setupIntent.client_secret,
          customerId: stripeCustomerId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      await logError(supabase, null, 'create-customer-setup-intent:setup-intent', 
        { profileId, customerId: stripeCustomerId }, error.message, error);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'SETUP_INTENT_FAILED', 
          message: 'Failed to initialize payment method setup' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Setup intent error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'INTERNAL_ERROR', 
        message: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logError(
  supabase: any,
  orgId: string | null,
  route: string,
  payload: any,
  errorMessage: string,
  stripeError?: any
) {
  try {
    await supabase.from('payment_errors').insert({
      org_id: orgId,
      route,
      payload,
      error: errorMessage,
      stripe_error_details: stripeError ? {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
      } : null,
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}
