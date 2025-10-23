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

    // Get organization for this user
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete, payments_ready')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      await logError(supabase, null, 'stripe-connect', { action }, 'Organization not found for user');
      return errorResponse('ORG_NOT_FOUND', 'Provider organization not found', 404);
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
          return errorResponse(
            'ACCOUNT_CREATE_FAILED', 
            'Failed to create Stripe account. Please try again.', 
            500,
            { stripe_error: formatStripeError(error) }
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

        return successResponse({
          clientSecret: accountSession.client_secret,
          accountId: stripeAccountId,
        });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:create-session', { action, stripeAccountId }, error.message, error);
        return errorResponse('SESSION_CREATE_FAILED', 'Failed to create onboarding session. Please try again.', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    if (action === 'create-dashboard-session') {
      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Complete Stripe setup first to access dashboard', 400);
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

        return successResponse({ clientSecret: accountSession.client_secret });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:dashboard-session', { action }, error.message, error);
        return errorResponse('DASHBOARD_FAILED', 'Failed to load dashboard. Please try again.', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    if (action === 'create-account-link') {
      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Stripe account not created yet', 400);
      }

      const appUrl = getAppUrl();

      try {
        const accountLink = await stripe.accountLinks.create({
          account: org.stripe_account_id,
          refresh_url: `${appUrl}/provider/settings?tab=payments&refresh=1`,
          return_url: `${appUrl}/provider/stripe-onboarding?success=1`,
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
