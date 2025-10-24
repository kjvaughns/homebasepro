import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 Starting subscription payment status sync...');

    // Get all active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('homeowner_subscriptions')
      .select('id, homeowner_id, provider_org_id')
      .eq('status', 'active');

    if (subError) throw subError;

    let updated = 0;
    let hasPaymentMethod = 0;
    let noPaymentMethod = 0;

    for (const sub of subscriptions || []) {
      try {
        // Get the homeowner's profile to find their user_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', sub.homeowner_id)
          .single();

        if (!profile?.user_id) continue;

        // Get customer record
        const { data: customer } = await supabase
          .from('customers')
          .select('stripe_customer_id, default_payment_method')
          .eq('user_id', profile.user_id)
          .single();

        let hasActivePayment = false;

        if (customer?.stripe_customer_id) {
          // Get provider's Stripe account
          const { data: org } = await supabase
            .from('organizations')
            .select('stripe_account_id')
            .eq('id', sub.provider_org_id)
            .single();

          if (org?.stripe_account_id) {
            // Verify with Stripe that customer has payment method
            try {
              const stripeCustomer = await stripeGet(
                `customers/${customer.stripe_customer_id}`,
                org.stripe_account_id
              );

              hasActivePayment = !!(
                stripeCustomer.invoice_settings?.default_payment_method ||
                stripeCustomer.default_source ||
                customer.default_payment_method
              );
            } catch (err) {
              console.error(`Failed to check Stripe customer ${customer.stripe_customer_id}:`, err);
            }
          }
        }

        // Update subscription
        await supabase
          .from('homeowner_subscriptions')
          .update({ payment_method_active: hasActivePayment })
          .eq('id', sub.id);

        updated++;
        if (hasActivePayment) hasPaymentMethod++;
        else noPaymentMethod++;

      } catch (err) {
        console.error(`Error processing subscription ${sub.id}:`, err);
      }
    }

    console.log(`✅ Sync complete: ${updated} updated, ${hasPaymentMethod} with payment, ${noPaymentMethod} without`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        hasPaymentMethod,
        noPaymentMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
