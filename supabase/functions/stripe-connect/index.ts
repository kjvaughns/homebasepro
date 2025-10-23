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

    // Auth is optional - JWT validation done by config.toml (verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user from JWT (guaranteed to exist due to verify_jwt = true)
  let user = null;
  if (authHeader) {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!authError && authUser) {
      user = authUser;
    }
  }

  console.log('🔐 Auth header present:', !!authHeader);
  console.log('👤 User authenticated:', !!user, user?.id);

  const { action } = await req.json();
  console.log('🎬 Action:', action);

  // Get organization for this user (if user exists)
  let org = null;
  if (user) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete, payments_ready')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (orgError) {
      await logError(supabase, null, 'stripe-connect', { action }, 'Database error fetching organization', orgError);
      return errorResponse('DB_ERROR', 'Database error fetching organization', 500);
    }

    org = orgData;
  }

  console.log('🏢 Organization found:', !!org, org?.id);

  // CREATE ACCOUNT (Express)
  if (action === 'create-account') {
    if (!user || !org) {
      return errorResponse('UNAUTHORIZED', 'User authentication required', 401);
    }

    if (org.stripe_account_id) {
      return successResponse({ account_id: org.stripe_account_id });
    }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address_line1, address_line2, address_city, address_state, address_postal_code, address_country, full_name, phone')
          .eq('user_id', user.id)
          .single();

        const individualAddress = profile?.address_line1 ? {
          line1: profile.address_line1,
          line2: profile.address_line2 || undefined,
          city: profile.address_city,
          state: profile.address_state,
          postal_code: profile.address_postal_code,
          country: profile.address_country || 'US'
        } : undefined;

        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: 'individual',
          individual: individualAddress ? {
            address: individualAddress,
            email: user.email,
            first_name: profile?.full_name?.split(' ')[0],
            last_name: profile?.full_name?.split(' ').slice(1).join(' '),
            phone: profile?.phone
          } : { email: user.email }
        });

        await supabase
          .from('organizations')
          .update({ stripe_account_id: account.id })
          .eq('id', org.id);

        return successResponse({ account_id: account.id });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:create-account', { action }, error.message, error);
        return errorResponse('ACCOUNT_CREATE_FAILED', 'Failed to create payment account', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

  // ACCOUNT LINK (Hosted onboarding)
  if (action === 'account-link') {
    if (!user || !org) {
      return errorResponse('UNAUTHORIZED', 'User authentication required', 401);
    }

    if (!org.stripe_account_id) {
      return errorResponse('NO_ACCOUNT', 'Create account first', 400);
    }

      const appUrl = getAppUrl();

      try {
        const accountLink = await stripe.accountLinks.create({
          account: org.stripe_account_id,
          refresh_url: `${appUrl}/provider/settings?tab=payments&refresh=1`,
          return_url: `${appUrl}/provider/settings?tab=payments&success=1`,
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

  // LOGIN LINK (Express dashboard)
  if (action === 'login-link') {
    if (!user || !org) {
      return errorResponse('UNAUTHORIZED', 'User authentication required', 401);
    }

    if (!org.stripe_account_id) {
      return errorResponse('NO_ACCOUNT', 'Complete onboarding first', 400);
    }

      try {
        const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id);
        return successResponse({ url: loginLink.url });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:login-link', { action }, error.message, error);
        return errorResponse('LOGIN_FAILED', 'Failed to create dashboard link', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

  // CHECK STATUS (public - can work without full auth)
  if (action === 'check-status') {
    if (!user || !org || !org.stripe_account_id) {
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

        await supabase
          .from('organizations')
          .update({
            stripe_onboarding_complete: detailsSubmitted,
            payments_ready: paymentsReady,
          })
          .eq('id', org.id);

        return successResponse({
          complete: detailsSubmitted,
          paymentsReady,
          detailsSubmitted,
          chargesEnabled,
          payoutsEnabled,
        });
      } catch (error: any) {
        await logError(supabase, org.id, 'stripe-connect:check-status', { action }, error.message, error);
        return errorResponse('STATUS_CHECK_FAILED', 'Failed to check account status', 500, {
          stripe_error: formatStripeError(error)
        });
      }
    }

    // LEGACY: create-account-session (embedded - deprecated)
    if (action === 'create-account-session') {
      if (!user || !org) {
        return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
      }

      let stripeAccountId = org.stripe_account_id;

      if (!stripeAccountId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address_line1, address_line2, address_city, address_state, address_postal_code, address_country, full_name, phone')
          .eq('user_id', user.id)
          .single();

        const individualAddress = profile?.address_line1 ? {
          line1: profile.address_line1,
          line2: profile.address_line2 || undefined,
          city: profile.address_city,
          state: profile.address_state,
          postal_code: profile.address_postal_code,
          country: profile.address_country || 'US'
        } : undefined;

        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: 'individual',
          individual: individualAddress ? {
            address: individualAddress,
            email: user.email,
            first_name: profile?.full_name?.split(' ')[0],
            last_name: profile?.full_name?.split(' ').slice(1).join(' '),
            phone: profile?.phone
          } : { email: user.email }
        });

        stripeAccountId = account.id;
        await supabase.from('organizations').update({ stripe_account_id: stripeAccountId }).eq('id', org.id);
      }

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
    }

    // LEGACY: create-dashboard-session (embedded)
    if (action === 'create-dashboard-session') {
      if (!org) {
        return errorResponse('NO_ORGANIZATION', 'Organization not found', 404);
      }

      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Complete Stripe setup first', 400);
      }

      const accountSession = await stripe.accountSessions.create({
        account: org.stripe_account_id,
        components: {
          account_management: { enabled: true },
          balances: { enabled: true },
          payouts: { enabled: true },
        },
      });

      return successResponse({ clientSecret: accountSession.client_secret });
    }

    // LEGACY: create-account-link (now just 'account-link')
    if (action === 'create-account-link') {
      if (!org) {
        return errorResponse('NO_ORGANIZATION', 'Organization not found', 404);
      }

      if (!org.stripe_account_id) {
        return errorResponse('NO_ACCOUNT', 'Stripe account not created yet', 400);
      }

      const appUrl = getAppUrl();

      const accountLink = await stripe.accountLinks.create({
        account: org.stripe_account_id,
        refresh_url: `${appUrl}/provider/settings?tab=payments&refresh=1`,
        return_url: `${appUrl}/provider/stripe-onboarding?success=1`,
        type: 'account_onboarding',
      });

      return successResponse({ url: accountLink.url });
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
