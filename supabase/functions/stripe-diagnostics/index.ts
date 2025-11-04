import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { getStripeSecret, getPublishableKey, getWebhookSecret } from '../_shared/env.ts';
import { stripePost } from '../_shared/stripe-fetch.ts';
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    console.log('🔍 Running Stripe Connect diagnostics...');

    // Check environment variables
    let hasStripeSecret = false;
    let secretMode = 'unknown';
    try { 
      const secret = getStripeSecret();
      hasStripeSecret = !!secret;
      secretMode = secret.startsWith('sk_live_') ? 'live' : 'test';
    } catch {}
    
    let hasPublishableKey = false;
    try { hasPublishableKey = !!getPublishableKey(); } catch {}
    
    let hasWebhookSecret = false;
    try { hasWebhookSecret = !!getWebhookSecret(); } catch {}

    // Check if connected accounts exist
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, plan')
      .not('stripe_account_id', 'is', null)
      .limit(5);

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError);
    }

    const sampleConnectedAccountPresent = (orgs?.length ?? 0) > 0;
    const connectedAccountsCount = orgs?.length ?? 0;

    // Test creating a checkout session (dry run with first connected account)
    let canCreateTestSession = false;
    let testSessionUrl = null;
    let testSessionError = null;

    if (hasStripeSecret && sampleConnectedAccountPresent && orgs?.[0]?.stripe_account_id) {
      try {
        const testOrg = orgs[0];
        console.log(`🧪 Testing session creation with account: ${testOrg.stripe_account_id}`);
        
        const session = await stripePost('checkout/sessions', {
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: { name: 'Diagnostic Test Payment' },
              unit_amount: 100 // $1.00
            },
            quantity: 1
          }],
          payment_intent_data: {
            application_fee_amount: 3, // 3% of $1.00 (beta plan fee)
            transfer_data: { destination: testOrg.stripe_account_id }
          },
          success_url: 'https://homebaseproapp.com/test/success',
          cancel_url: 'https://homebaseproapp.com/test/cancel',
        });
        
        canCreateTestSession = !!session.url;
        testSessionUrl = session.url;
        console.log('✅ Test session created successfully');
      } catch (e: any) {
        console.error('❌ Test session creation failed:', e.message);
        testSessionError = e.message;
      }
    }

    const result = {
      ok: true,
      timestamp: new Date().toISOString(),
      mode: secretMode,
      checks: {
        hasStripeKeys: hasStripeSecret,
        hasPublishableKey,
        webhookConfigured: hasWebhookSecret,
        sampleConnectedAccountPresent,
        canCreateTestSession
      },
      details: {
        connected_accounts_count: connectedAccountsCount,
        sample_accounts: orgs?.map(o => ({
          id: o.id,
          stripe_account_id: o.stripe_account_id,
          plan: o.plan
        })) || [],
        test_session_url: testSessionUrl,
        test_session_error: testSessionError
      },
      recommendations: [] as string[]
    };

    // Add recommendations
    if (!hasStripeSecret) {
      result.recommendations.push('⚠️ CRITICAL: STRIPE_SECRET not configured in environment');
    }
    if (!hasPublishableKey) {
      result.recommendations.push('⚠️ STRIPE_PUBLISHABLE_KEY not configured');
    }
    if (!hasWebhookSecret) {
      result.recommendations.push('⚠️ STRIPE_WEBHOOK_SECRET not configured - webhooks will not work');
    }
    if (!sampleConnectedAccountPresent) {
      result.recommendations.push('ℹ️ No providers have completed Stripe Connect onboarding yet');
    }
    if (!canCreateTestSession && hasStripeSecret && sampleConnectedAccountPresent) {
      result.recommendations.push('⚠️ Cannot create test checkout sessions - check Stripe account configuration');
    }
    if (result.recommendations.length === 0) {
      result.recommendations.push('✅ All checks passed! Stripe Connect is properly configured.');
    }

    console.log('✅ Diagnostics complete:', result);

    return successResponse(result);

  } catch (error: any) {
    console.error('💥 Diagnostics error:', error);
    return errorResponse(
      'DIAGNOSTICS_FAILED',
      error.message || 'Failed to run diagnostics',
      500
    );
  }
});
