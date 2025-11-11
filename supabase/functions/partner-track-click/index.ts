import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { successResponse, errorResponse } from "../_shared/http.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { referral_slug } = await req.json();

    if (!referral_slug) {
      return errorResponse('VALIDATION_ERROR', 'Missing referral_slug', 400);
    }

    // Find partner by referral slug
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, status')
      .eq('referral_slug', referral_slug)
      .single();

    if (partnerError || !partner) {
      return errorResponse('NOT_FOUND', 'Invalid referral link', 404);
    }

    if (partner.status !== 'ACTIVE') {
      return errorResponse('INACTIVE', 'Partner is not active', 403);
    }

    // Get request metadata
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    const referer = req.headers.get('referer');

    // Log the click
    const { error: clickError } = await supabase
      .from('partner_clicks')
      .insert({
        partner_id: partner.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referer: referer,
      });

    if (clickError) {
      console.error('Failed to log click:', clickError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        partner_id: partner.id,
        tracked: true,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Click tracking error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to track click',
      500
    );
  }
});
