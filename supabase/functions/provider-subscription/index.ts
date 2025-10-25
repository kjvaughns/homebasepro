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

    // Parse request body early to check action
    const body = await req.json().catch(() => ({}));
    const { action, plan, paymentMethodId } = body;

    // Check-config action doesn't require auth (public endpoint)
    if (action === 'check-config') {
      const stripePriceId = Deno.env.get('STRIPE_PRICE_BETA_MONTHLY');
      return new Response(
        JSON.stringify({ 
          hasStripe: !!stripeKey, 
          hasPrice: !!stripePriceId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use Supabase's built-in auth verification (more reliable)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized - Please sign in again');
    }

    // Register free plan (no payment required)
    if (action === 'register-free-plan') {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!org) {
        throw new Error('Organization not found');
      }

      // Update organization to FREE plan
      await supabase
        .from('organizations')
        .update({
          plan: 'free',
          transaction_fee_pct: 0.08,
          team_limit: 5
        })
        .eq('id', org.id);

      // Update profile
      await supabase
        .from('profiles')
        .update({
          plan: 'free',
          onboarded_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          plan: 'free',
          message: 'FREE plan activated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SetupIntent for embedded card collection
    if (action === 'create-setup-intent') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      let customerId = profile?.stripe_customer_id;

      // Create or retrieve customer
      if (!customerId) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('email, name')
          .eq('owner_id', user.id)
          .single();

        const customer = await stripe.customers.create({
          email: orgs?.email || user.email,
          name: orgs?.name,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;

        // Save customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
      }

      // Create SetupIntent for card collection
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: { 
          purpose: 'trial_subscription',
          user_id: user.id 
        }
      });

      return new Response(
        JSON.stringify({ 
          clientSecret: setupIntent.client_secret,
          customerId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Activate trial subscription after card is collected
    if (action === 'activate-trial-subscription') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.stripe_customer_id) {
        throw new Error('Customer not found');
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!org) {
        throw new Error('Organization not found');
      }

      const stripePriceId = Deno.env.get('STRIPE_PRICE_BETA_MONTHLY');
      if (!stripePriceId) {
        throw new Error('Trial price not configured');
      }

      // Create subscription with trial
      const subscription = await stripe.subscriptions.create({
        customer: profile.stripe_customer_id,
        items: [{ price: stripePriceId }],
        trial_period_days: 14,
        default_payment_method: paymentMethodId,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          org_id: org.id,
          user_id: user.id,
          plan: 'beta'
        }
      });

      const trialEnd = new Date(subscription.trial_end! * 1000).toISOString();

      // Update profiles
      await supabase
        .from('profiles')
        .update({
          stripe_subscription_id: subscription.id,
          plan: 'beta',
          trial_ends_at: trialEnd,
          onboarded_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Update organizations
      await supabase
        .from('organizations')
        .update({
          plan: 'beta',
          transaction_fee_pct: 0.03,
          team_limit: 3
        })
        .eq('id', org.id);

      // Create subscription record
      await supabase
        .from('provider_subscriptions')
        .upsert({
          provider_id: org.id,
          stripe_customer_id: profile.stripe_customer_id,
          stripe_subscription_id: subscription.id,
          plan: 'beta',
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          subscription,
          trialEndsAt: trialEnd
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


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
            success_url: `${req.headers.get('origin') || 'https://homebaseproapp.com'}/provider/dashboard?setup=complete`,
            cancel_url: `${req.headers.get('origin') || 'https://homebaseproapp.com'}/onboarding/provider?canceled=true`,
            payment_method_collection: 'always',
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
