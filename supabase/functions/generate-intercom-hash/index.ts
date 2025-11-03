import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { handleCorsPrefilight, successResponse, errorResponse } from '../_shared/http.ts';

const INTERCOM_IDENTITY_VERIFICATION_SECRET = Deno.env.get('INTERCOM_IDENTITY_VERIFICATION_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const corsResponse = handleCorsPrefilight(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('NO_AUTH', 'Authorization header required', 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('AUTH_ERROR', 'Invalid authentication', 401);
    }

    // Generate HMAC hash of user ID
    let hash = '';
    if (INTERCOM_IDENTITY_VERIFICATION_SECRET) {
      hash = createHmac('sha256', INTERCOM_IDENTITY_VERIFICATION_SECRET)
        .update(user.id)
        .digest('hex');
    } else {
      console.warn('INTERCOM_IDENTITY_VERIFICATION_SECRET not configured - identity verification disabled');
    }

    return successResponse({ 
      hash,
      user_id: user.id,
      verified: !!INTERCOM_IDENTITY_VERIFICATION_SECRET
    });

  } catch (error) {
    console.error('Hash generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('HASH_ERROR', message, 500);
  }
});
