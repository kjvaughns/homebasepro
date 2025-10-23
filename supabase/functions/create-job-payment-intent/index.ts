import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { createStripeClient, formatStripeError } from "../_shared/stripe.ts";
import { getPlatformFeePercent, getCurrency } from "../_shared/env.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const stripe = createStripeClient();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', 'Missing authorization', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('AUTH_FAILED', 'Authentication failed', 401);
    }

    const { jobId, providerOrgId, amountCents, description, metadata } = await req.json();

    if (!jobId || !providerOrgId || !amountCents) {
      return errorResponse('MISSING_PARAMS', 'Missing required parameters', 400);
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
      return errorResponse('PROVIDER_NOT_FOUND', 'Provider not found', 404);
    }

    if (!org.stripe_account_id) {
      await logError(supabase, org.id, 'create-job-payment-intent', 
        { jobId, providerOrgId }, 'Provider has not connected Stripe');
      return errorResponse('STRIPE_NOT_CONNECTED', 'Provider has not set up payments yet', 400);
    }

    if (!org.payments_ready) {
      await logError(supabase, org.id, 'create-job-payment-intent', 
        { jobId, providerOrgId }, 'Provider payments not ready');
      return errorResponse('PAYMENTS_NOT_READY', 'Provider has not completed payment setup', 400);
    }

    // Get platform fee percentage
    const feePct = getPlatformFeePercent();
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'PLATFORM_FEE_PERCENT')
      .single();
    
    const finalFeePct = settings?.value ? parseInt(settings.value as string) : feePct;
    const appFee = Math.floor(amountCents * (finalFeePct / 100));

    const currency = getCurrency();

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

      return successResponse({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        applicationFee: appFee,
      });
    } catch (error: any) {
      await logError(supabase, org.id, 'create-job-payment-intent:create-intent', 
        { jobId, providerOrgId, amountCents }, error.message, error);
      return errorResponse('PAYMENT_INTENT_FAILED', 'Failed to create payment. Please try again.', 500, {
        stripe_error: formatStripeError(error)
      });
    }

  } catch (error: any) {
    console.error('Payment intent error:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Internal server error', 500);
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
