import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Unauthorized: No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    console.log('Auth check - User:', user?.id, 'Error:', authError?.message);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error(`Unauthorized: ${authError?.message || 'No user found'}`);
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 
                           Deno.env.get('STRIPE_SECRET') || 
                           Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    
    console.log('Stripe key available:', !!stripeSecretKey);
    
    if (!stripeSecretKey) {
      console.error('No Stripe secret key found in environment');
      throw new Error('Stripe secret key not configured');
    }

    // Create Stripe customer if doesn't exist
    console.log('Fetching profile for user:', user.id);
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    let customerId = profile?.stripe_customer_id;
    console.log('Existing customer ID:', customerId);

    if (!customerId) {
      console.log('Creating new Stripe customer');
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email!,
          name: profile?.full_name || user.email!,
          metadata: JSON.stringify({ user_id: user.id })
        }).toString(),
      });

      const customer = await customerResponse.json();
      
      if (!customerResponse.ok) {
        console.error('Stripe customer creation failed:', customer);
        throw new Error(customer.error?.message || 'Failed to create Stripe customer');
      }
      
      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);

      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Create SetupIntent
    console.log('Creating setup intent for customer:', customerId);
    const setupIntentResponse = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'metadata[user_id]': user.id,
        'payment_method_types[]': 'card',
      }).toString(),
    });

    const setupIntent = await setupIntentResponse.json();

    if (!setupIntentResponse.ok) {
      console.error('Setup intent creation failed:', setupIntent);
      throw new Error(setupIntent.error?.message || 'Failed to create setup intent');
    }

    console.log('Setup intent created successfully');

    return new Response(
      JSON.stringify({ clientSecret: setupIntent.client_secret }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
