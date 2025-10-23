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
    // Initialize Stripe with consistent env var name
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET') || Deno.env.get('stripe_secret_key') || Deno.env.get('stripe');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET not configured');
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get auth token and create Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, code: 'AUTH_FAILED', message: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { action } = await req.json();

    // Get organization for this user
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete, payments_ready')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      await logError(supabase, null, 'stripe-connect', { action }, 'Organization not found for user');
      return new Response(
        JSON.stringify({ ok: false, code: 'ORG_NOT_FOUND', message: 'Provider organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    if (action === 'create-account-session') {
      // Create or retrieve Stripe Connect account
      let stripeAccountId = org.stripe_account_id;

      if (!stripeAccountId) {
        // Create new Express account
        try {
          const account = await stripe.accounts.create({
            type: 'express',
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true },
            },
            business_type: 'individual',
          });

          stripeAccountId = account.id;

          // Save account ID
          await supabase
            .from('organizations')
            .update({ stripe_account_id: stripeAccountId })
            .eq('id', org.id);

          console.log('Created new Stripe account:', stripeAccountId);
        } catch (error: any) {
          await logError(supabase, org.id, 'stripe-connect:create-account', { action }, error.message, error);
          return new Response(
            JSON.stringify({ 
              ok: false, 
              code: 'ACCOUNT_CREATE_FAILED', 
              message: 'Failed to create Stripe account. Please try again.' 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create account session for embedded onboarding
      try {
        const accountSession = await stripe.accountSessions.create({
          account: stripeAccountId,
          components: {
            account_onboarding: { enabled: true },
            account_management: { enabled: true },
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            clientSecret: accountSession.client_secret,
            accountId: stripeAccountId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:create-session', { action, stripeAccountId }, error.message, error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'SESSION_CREATE_FAILED', 
            message: 'Failed to create onboarding session. Please try again.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create-dashboard-session') {
      if (!org.stripe_account_id) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'NO_ACCOUNT', 
            message: 'Complete Stripe setup first to access dashboard' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const accountSession = await stripe.accountSessions.create({
          account: org.stripe_account_id,
          components: {
            account_management: { enabled: true },
            balances: { enabled: true },
            payouts: { enabled: true },
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            clientSecret: accountSession.client_secret,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:dashboard-session', { action }, error.message, error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'DASHBOARD_FAILED', 
            message: 'Failed to load dashboard. Please try again.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create-account-link') {
      if (!org.stripe_account_id) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'NO_ACCOUNT', 
            message: 'Stripe account not created yet' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const appUrl = Deno.env.get('APP_URL') || 'https://homebaseproapp.com';

      try {
        const accountLink = await stripe.accountLinks.create({
          account: org.stripe_account_id,
          refresh_url: `${appUrl}/provider/settings?tab=payments&refresh=1`,
          return_url: `${appUrl}/provider/stripe-onboarding?success=1`,
          type: 'account_onboarding',
        });

        return new Response(
          JSON.stringify({ success: true, url: accountLink.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:account-link', { action }, error.message, error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'LINK_CREATE_FAILED', 
            message: 'Failed to create onboarding link' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'check-status') {
      if (!org.stripe_account_id) {
        return new Response(
          JSON.stringify({
            success: true,
            complete: false,
            paymentsReady: false,
            detailsSubmitted: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const account = await stripe.accounts.retrieve(org.stripe_account_id);

        const detailsSubmitted = account.details_submitted || false;
        const chargesEnabled = account.charges_enabled || false;
        const payoutsEnabled = account.payouts_enabled || false;
        const paymentsReady = chargesEnabled && payoutsEnabled;

        // Update database with current status
        await supabase
          .from('organizations')
          .update({
            stripe_onboarding_complete: detailsSubmitted,
            payments_ready: paymentsReady,
          })
          .eq('id', org.id);

        return new Response(
          JSON.stringify({
            success: true,
            complete: detailsSubmitted,
            paymentsReady: paymentsReady,
            detailsSubmitted: detailsSubmitted,
            chargesEnabled: chargesEnabled,
            payoutsEnabled: payoutsEnabled,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:check-status', { action }, error.message, error);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'STATUS_CHECK_FAILED', 
            message: 'Failed to check account status' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: false, code: 'INVALID_ACTION', message: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Stripe Connect error:', error);
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
      route: route,
      payload: payload,
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
