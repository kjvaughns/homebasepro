import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { createStripeClient, isLiveMode } from "../_shared/stripe.ts";
import { getStripeSecret, getWebhookSecret } from "../_shared/env.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    // Verify env var exists
    let hasSecret = false;
    let errorMsg = '';
    try {
      hasSecret = !!getStripeSecret();
    } catch (e: any) {
      errorMsg = e.message;
    }

    if (!hasSecret) {
      return errorResponse('NO_STRIPE_SECRET', `STRIPE_SECRET not configured: ${errorMsg}`, 500);
    }

    // Test Stripe API connectivity
    const stripe = createStripeClient();
    const balance = await stripe.balance.retrieve();

    return successResponse({
      env: isLiveMode() ? 'live' : 'test',
      balance_object: balance.object,
      has_webhook_secret: !!getWebhookSecret(),
      currencies: balance.available.map((b: any) => b.currency),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return errorResponse(
      'STRIPE_HEALTH_FAIL',
      error?.message || 'Stripe API test failed',
      500,
      {
        type: error?.type,
        code: error?.code,
        stripe_error: error?.raw,
      }
    );
  }
});
