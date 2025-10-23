import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { createStripeClient, formatStripeError } from "../_shared/stripe.ts";
import { getAppUrl } from "../_shared/env.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const stripe = createStripeClient();

    // Get auth token and create Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', 'Missing authorization header', 401);
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
      return errorResponse('AUTH_FAILED', 'Authentication failed', 401);
    }

    // Get request body
    const { action } = await req.json();

    // Get organization for this user (or create one)
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete, payments_ready, name')
      .eq('owner_id', user.id)
      .single();

    // Auto-create organization if missing
    if (orgError || !org) {
      console.log('Organization not found, creating one for user:', user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', user.id)
        .single();

      const orgName = profile?.full_name || user.email?.split('@')[0] || 'My Business';
      
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          owner_id: user.id,
          name: orgName,
          slug: `${orgName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          plan: 'free',
          team_limit: 5,
        })
        .select('id, stripe_account_id, stripe_onboarding_complete, payments_ready, name')
        .single();

      if (createError || !newOrg) {
        await logError(supabase, null, 'stripe-connect', { action }, 'Failed to create organization');
        return errorResponse('ORG_CREATE_FAILED', 'Failed to create provider organization', 500);
      }

      org = newOrg;
    }

    // Handle different actions
    if (action === 'create-account') {
      // Create new Express account if needed
      let stripeAccountId = org.stripe_account_id;

      if (!stripeAccountId) {
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
          return errorResponse(
            'ACCOUNT_CREATE_FAILED', 
            'Failed to create Stripe account. Please try again.', 
            500,
            { stripe_error: formatStripeError(error) }
          );
        }
      }

      return successResponse({ account_id: stripeAccountId });
    }

    if (action === 'account-link') {
      // Create hosted onboarding link
      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Create account first', 400);
      }

      const appUrl = getAppUrl();

      try {
        const accountLink = await stripe.accountLinks.create({
          account: org.stripe_account_id,
          refresh_url: `${appUrl}/provider/payments?onboarding=retry`,
          return_url: `${appUrl}/provider/payments?onboarding=done`,
          type: 'account_onboarding',
        });

        return successResponse({ url: accountLink.url });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:account-link', { action }, error.message, error);
        return errorResponse('LINK_CREATE_FAILED', 'Failed to create onboarding link', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    if (action === 'login-link') {
      // Create hosted Express dashboard login link
      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Complete Stripe setup first', 400);
      }

      try {
        const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id);

        return successResponse({ url: loginLink.url });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:login-link', { action }, error.message, error);
        return errorResponse('LOGIN_LINK_FAILED', 'Failed to create login link', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    if (action === 'check-status') {
      if (!org.stripe_account_id) {
        return successResponse({
          complete: false,
          paymentsReady: false,
          detailsSubmitted: false,
        });
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

        return successResponse({
          complete: detailsSubmitted,
          paymentsReady: paymentsReady,
          detailsSubmitted: detailsSubmitted,
          chargesEnabled: chargesEnabled,
          payoutsEnabled: payoutsEnabled,
        });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:check-status', { action }, error.message, error);
        return errorResponse('STATUS_CHECK_FAILED', 'Failed to check account status', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    return errorResponse('INVALID_ACTION', `Unknown action: ${action}`, 400);

  } catch (error: any) {
    console.error('Stripe Connect error:', error);
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
