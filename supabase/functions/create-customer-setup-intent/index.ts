import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { createStripeClient, formatStripeError } from "../_shared/stripe.ts";

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

    const { profileId, email } = await req.json();

    // Get user's email if not provided
    const userEmail = email || user.email;
    if (!userEmail) {
      return errorResponse('EMAIL_REQUIRED', 'Email address required', 400);
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
        return errorResponse('CUSTOMER_CREATE_FAILED', 'Failed to create customer account', 500, {
          stripe_error: formatStripeError(error)
        });
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

      return successResponse({
        clientSecret: setupIntent.client_secret,
        customerId: stripeCustomerId,
      });
    } catch (error: any) {
      await logError(supabase, null, 'create-customer-setup-intent:setup-intent', 
        { profileId, customerId: stripeCustomerId }, error.message, error);
      return errorResponse('SETUP_INTENT_FAILED', 'Failed to initialize payment method setup', 500, {
        stripe_error: formatStripeError(error)
      });
    }

  } catch (error: any) {
    console.error('Setup intent error:', error);
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
