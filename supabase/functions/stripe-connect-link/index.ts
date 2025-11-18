import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { stripePost } from "../_shared/stripe-fetch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Get organization
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, email, name, stripe_account_id')
      .eq('owner_id', user.id)
      .single();

    if (orgError) throw orgError;
    if (!org) throw new Error('Organization not found');

    console.log('🔗 Creating Stripe Connect link for:', org.name);

    let accountId = org.stripe_account_id;

    // Create new Stripe account if doesn't exist
    if (!accountId) {
      const account = await stripePost('accounts', {
        type: 'express',
        country: 'US',
        email: org.email || user.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      accountId = account.id;

      // Save account ID
      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ stripe_account_id: accountId })
        .eq('id', org.id);

      if (updateError) {
        console.error('Error saving account ID:', updateError);
      }

      console.log('✅ Created new Stripe account:', accountId);
    }

    // Create account link for onboarding
    const appUrl = Deno.env.get('APP_URL') || 'https://app.homebaseproapp.com';
    const accountLink = await stripePost('account_links', {
      account: accountId,
      refresh_url: `${appUrl}/provider/settings/billing?connect=refresh`,
      return_url: `${appUrl}/provider/settings/billing?connect=success`,
      type: 'account_onboarding'
    });

    console.log('✅ Generated account link');

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error creating Stripe Connect link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});