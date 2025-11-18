import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
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
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return errorResponse('NO_AUTH', 'Authorization header required', 401);
    }

    // Create Supabase client with auth header in global config
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Call getUser without parameters - it will use the Authorization header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error details:', authError);
      return errorResponse('AUTH_ERROR', authError?.message || 'Invalid authentication', 401);
    }
    
    console.log('User authenticated successfully:', user.id);

    // Get user profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, full_name')
      .eq('user_id', user.id)
      .single();

    // Generate JWT token for Intercom
    let token = '';
    if (INTERCOM_IDENTITY_VERIFICATION_SECRET) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(INTERCOM_IDENTITY_VERIFICATION_SECRET);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Create JWT payload
      const payload = {
        user_id: user.id,
        email: user.email || '',
        name: profile?.full_name || user.email || 'User',
        created_at: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      };

      // Create JWT token using djwt
      token = await create(
        { alg: 'HS256', typ: 'JWT' },
        payload,
        key
      );

      console.log('Generated JWT token for user:', user.id);
    } else {
      console.warn('INTERCOM_IDENTITY_VERIFICATION_SECRET not configured - identity verification disabled');
    }

    return successResponse({ 
      token,
      user_id: user.id,
      verified: !!INTERCOM_IDENTITY_VERIFICATION_SECRET
    });

  } catch (error) {
    console.error('Token generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('TOKEN_ERROR', message, 500);
  }
});
