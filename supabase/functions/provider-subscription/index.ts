import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('stripe_secret_key');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) {
      throw new Error('Unauthorized');
    }

    const user = await userRes.json();
    const { action, plan, paymentMethodId } = await req.json();

    // Get user's organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !orgs) {
      throw new Error('No organization found');
    }

    const org = orgs;

    // Plan pricing configuration
    const planConfig: Record<string, { priceId: string; feePercent: number; teamLimit: number; price: number; trialDays?: number }> = {
      beta: { priceId: Deno.env.get('STRIPE_PRICE_BETA_MONTHLY') || 'price_beta_monthly', feePercent: 0.03, teamLimit: 3, price: 1500, trialDays: 14 },
      growth: { priceId: 'price_growth_monthly', feePercent: 0.025, teamLimit: 3, price: 2900 },
      pro: { priceId: 'price_pro_monthly', feePercent: 0.02, teamLimit: 10, price: 9900 },
      scale: { priceId: 'price_scale_monthly', feePercent: 0.02, teamLimit: 25, price: 29900 },
    };

    if (action === 'create-subscription' || action === 'upgrade-plan') {
      if (!plan || !planConfig[plan]) {
        throw new Error('Invalid plan selected');
      }

      const config = planConfig[plan];

      // Get or create provider subscription record
      let { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('*')
        .eq('provider_id', org.id)
        .single();

      let stripeCustomerId = subscription?.stripe_customer_id;

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: org.email,
          name: org.name,
          metadata: {
            org_id: org.id,
            user_id: user.id,
          },
        });
        stripeCustomerId = customer.id;
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });

        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create or update subscription
      let stripeSub;
      if (subscription?.stripe_subscription_id && action === 'upgrade-plan') {
        // Update existing subscription
        stripeSub = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          items: [{
            id: (await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)).items.data[0].id,
            price: config.priceId,
          }],
          proration_behavior: 'always_invoice',
        });
      } else {
        // Create new subscription with trial if configured
        if (config.trialDays) {
          // Use Checkout Session for trial with card collection
          const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{
              price: config.priceId,
              quantity: 1,
            }],
            subscription_data: {
              trial_period_days: config.trialDays,
              trial_settings: {
                end_behavior: { missing_payment_method: 'cancel' }
              },
              metadata: {
                org_id: org.id,
                user_id: user.id,
                plan: plan,
              }
            },
            success_url: `${req.headers.get('origin')}/provider/settings?tab=billing&success=true`,
            cancel_url: `${req.headers.get('origin')}/provider/settings?tab=billing&canceled=true`,
            metadata: {
              org_id: org.id,
              user_id: user.id,
              plan: plan,
            }
          });

          return new Response(
            JSON.stringify({ checkoutUrl: checkoutSession.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create regular subscription without trial
        stripeSub = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: config.priceId }],
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            org_id: org.id,
            user_id: user.id,
            plan: plan,
          }
        });
      }

      // Update provider_subscriptions table
      await supabase
        .from('provider_subscriptions')
        .upsert({
          provider_id: org.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSub.id,
          plan: plan,
          status: stripeSub.status,
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        });

      // Update organizations table with new plan details
      await supabase
        .from('organizations')
        .update({
          plan: plan,
          transaction_fee_pct: config.feePercent,
          team_limit: config.teamLimit,
        })
        .eq('id', org.id);

      return new Response(
        JSON.stringify({
          subscription: stripeSub,
          clientSecret: (stripeSub.latest_invoice as any)?.payment_intent?.client_secret,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel-subscription') {
      const { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('*')
        .eq('provider_id', org.id)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No active subscription found');
      }

      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await supabase
        .from('provider_subscriptions')
        .update({ status: 'canceling' })
        .eq('provider_id', org.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription will cancel at period end' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-subscription') {
      const { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('*')
        .eq('provider_id', org.id)
        .single();

      return new Response(
        JSON.stringify({ subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-stripe-subscription') {
      const { subscriptionId } = await req.json();
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      return new Response(
        JSON.stringify({ subscription: { cancel_at_period_end: stripeSub.cancel_at_period_end } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BUG-007 FIX: Get full Stripe subscription details
    if (action === 'get-stripe-subscription') {
      const { subscriptionId } = await req.json();
      
      if (!subscriptionId) {
        throw new Error('Subscription ID required');
      }

      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

      return new Response(
        JSON.stringify({ 
          subscription: {
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            current_period_end: stripeSub.current_period_end,
            status: stripeSub.status,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Provider subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
