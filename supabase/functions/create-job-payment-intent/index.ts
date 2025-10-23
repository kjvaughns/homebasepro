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

    const { jobId, providerOrgId, amountCents, description, metadata } = await req.json();

    if (!jobId || !providerOrgId || !amountCents) {
      return new Response(
        JSON.stringify({ ok: false, code: 'MISSING_PARAMS', message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, payments_ready')
      .eq('id', providerOrgId)
      .single();

    if (orgError || !org) {
      await logError(supabase, providerOrgId, 'create-job-payment-intent', 
        { jobId, providerOrgId }, 'Provider organization not found');
      return new Response(
        JSON.stringify({ ok: false, code: 'PROVIDER_NOT_FOUND', message: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org.stripe_account_id) {
      await logError(supabase, org.id, 'create-job-payment-intent', 
        { jobId, providerOrgId }, 'Provider has not connected Stripe');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'STRIPE_NOT_CONNECTED', 
          message: 'Provider has not set up payments yet' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org.payments_ready) {
      await logError(supabase, org.id, 'create-job-payment-intent', 
        { jobId, providerOrgId }, 'Provider payments not ready');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'PAYMENTS_NOT_READY', 
          message: 'Provider has not completed payment setup' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get platform fee percentage
    const feePct = parseInt(Deno.env.get('PLATFORM_FEE_PERCENT') || '5');
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'PLATFORM_FEE_PERCENT')
      .single();
    
    const finalFeePct = settings?.value ? parseInt(settings.value as string) : feePct;
    const appFee = Math.floor(amountCents * (finalFeePct / 100));

    const currency = Deno.env.get('CURRENCY') || 'usd';

    // Create PaymentIntent with application fee and transfer
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency,
        automatic_payment_methods: { enabled: true },
        application_fee_amount: appFee,
        transfer_data: {
          destination: org.stripe_account_id,
        },
        metadata: {
          job_id: jobId,
          provider_org_id: providerOrgId,
          platform_fee_percent: finalFeePct.toString(),
          ...(metadata || {}),
        },
        description: description || `Payment for booking ${jobId}`,
      });

      // Update job with payment intent ID
      await supabase
        .from('bookings')
        .update({ 
          payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      console.log('Created PaymentIntent:', paymentIntent.id, 'for job:', jobId);

      return new Response(
        JSON.stringify({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          applicationFee: appFee,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      await logError(supabase, org.id, 'create-job-payment-intent:create-intent', 
        { jobId, providerOrgId, amountCents }, error.message, error);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'PAYMENT_INTENT_FAILED', 
          message: 'Failed to create payment. Please try again.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Payment intent error:', error);
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
