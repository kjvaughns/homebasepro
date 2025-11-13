import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { stripePost } from "../_shared/stripe-fetch.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', 'Missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Invalid token', 401);
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return errorResponse('FORBIDDEN', 'Admin access required', 403);
    }

    const { partner_id } = await req.json();

    if (!partner_id) {
      return errorResponse('VALIDATION_ERROR', 'Missing partner_id', 400);
    }

    // Get partner record
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .maybeSingle();

    if (partnerError || !partner) {
      return errorResponse('NOT_FOUND', 'Partner not found', 404);
    }

    if (partner.status !== 'PENDING') {
      return errorResponse('INVALID_STATUS', 'Partner is not pending approval', 400);
    }

    // Create Stripe Coupon with referral code as coupon ID
    const couponPercentOff = Math.max(0, Math.floor(((partner as any).discount_rate_bp ?? 1000) / 100));
    const coupon = await stripePost('coupons', {
      id: partner.referral_code, // Use referral code as coupon ID so customers can apply it directly
      percent_off: couponPercentOff,
      duration: 'forever',
      name: `Partner ${partner.referral_code} - ${couponPercentOff}% off`,
      metadata: {
        partner_id: partner.id,
        partner_code: partner.referral_code,
      },
    });

    console.log('Created Stripe coupon:', coupon.id);

    // Create Stripe Connect Express Account
    const account = await stripePost('accounts', {
      type: 'express',
      country: 'US',
      email: (partner as any).email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        partner_id: partner.id,
        partner_code: partner.referral_code,
      },
    });

    console.log('Created Stripe Connect account:', account.id);

    // Create account link for onboarding
    const accountLink = await stripePost('account_links', {
      account: account.id,
      refresh_url: `${Deno.env.get('APP_URL') || 'https://homebaseproapp.com'}/partners/dashboard?onboarding=refresh`,
      return_url: `${Deno.env.get('APP_URL') || 'https://homebaseproapp.com'}/partners/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    });

    console.log('Created account onboarding link');

    // Update partner record
    const { error: updateError } = await supabase
      .from('partners')
      .update({
        status: 'ACTIVE',
        stripe_coupon_id: coupon.id,
        stripe_promo_id: coupon.id, // Using coupon ID since we're not creating separate promo codes
        stripe_account_id: account.id,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', partner_id);

    if (updateError) {
      console.error('Failed to update partner:', updateError);
      return errorResponse('UPDATE_FAILED', 'Failed to update partner record', 500);
    }

    // TODO: Send approval email with onboarding link to partner

    return successResponse({
      message: 'Partner approved successfully',
      partner_id: partner.id,
      referral_code: partner.referral_code,
      onboarding_url: accountLink.url,
      stripe_account_id: account.id,
    });

  } catch (error) {
    console.error('Partner approval error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to approve partner',
      500
    );
  }
});
