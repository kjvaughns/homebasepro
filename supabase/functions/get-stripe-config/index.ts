import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { getPublishableKey } from "../_shared/env.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const publishableKey = getPublishableKey();
    
    if (!publishableKey) {
      console.error('Stripe publishable key not configured in environment');
      return errorResponse('CONFIG_MISSING', 'Payment system not configured. Contact support.', 500);
    }

    return successResponse({ publishableKey });
  } catch (error) {
    console.error('Get Stripe config error:', error);
    return errorResponse(
      'INTERNAL_ERROR', 
      error instanceof Error ? error.message : 'Failed to load payment configuration',
      500
    );
  }
});
