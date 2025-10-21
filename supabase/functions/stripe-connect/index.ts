import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('stripe');
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

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) {
      throw new Error('Unauthorized');
    }

    const user = await userRes.json();
    
    const { action } = await req.json();

    if (action === 'create-account-link') {
      // Get user's organization
      const orgRes = await fetch(`${supabaseUrl}/rest/v1/organizations?owner_id=eq.${user.id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const orgs = await orgRes.json();
      if (!orgs || orgs.length === 0) {
        throw new Error('No organization found');
      }
      
      const org = orgs[0];
      
      let accountId = org.stripe_account_id;
      
      // Create Stripe Connect account if doesn't exist
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'standard',
          email: org.email,
          business_profile: {
            name: org.name,
          },
        });
        accountId = account.id;
        
        // Save to database
        await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${org.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            stripe_account_id: accountId,
          }),
        });
      }
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${req.headers.get('origin')}/provider/settings?tab=payments&refresh=true`,
        return_url: `${req.headers.get('origin')}/provider/settings?tab=payments&success=true`,
        type: 'account_onboarding',
      });
      
      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'check-status') {
      const orgRes = await fetch(`${supabaseUrl}/rest/v1/organizations?owner_id=eq.${user.id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const orgs = await orgRes.json();
      if (!orgs || orgs.length === 0) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const org = orgs[0];
      
      if (!org.stripe_account_id) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if account is fully onboarded
      const account = await stripe.accounts.retrieve(org.stripe_account_id);
      const complete = account.charges_enabled && account.payouts_enabled;
      
      // Update database if complete
      if (complete && !org.stripe_onboarding_complete) {
        await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${org.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            stripe_onboarding_complete: true,
          }),
        });
      }
      
      return new Response(
        JSON.stringify({ 
          connected: true, 
          complete,
          accountId: org.stripe_account_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});