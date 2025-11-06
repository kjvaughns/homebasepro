import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, stripe_account_id')
      .eq('owner_id', user.id)
      .single();

    if (!org?.stripe_account_id) {
      return new Response(JSON.stringify({ 
        error: 'Stripe account not connected',
        setupRequired: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch balance from Stripe
    const balance = await stripeGet('balance', org.stripe_account_id);

    // Fetch account details (for payout schedule)
    const account = await stripeGet(`accounts/${org.stripe_account_id}`);

    // Fetch payout history
    const payouts = await stripeGet(`payouts?limit=20`, org.stripe_account_id);

    // Check instant payout eligibility
    const capabilities = account.capabilities || {};
    const instantPayoutsEnabled = capabilities.instant_payouts === 'active';

    // Get external accounts (bank accounts)
    const externalAccounts = account.external_accounts?.data || [];
    const bankAccount = externalAccounts.find((acc: any) => acc.object === 'bank_account');

    const result = {
      balance: {
        available: balance.available?.[0]?.amount || 0,
        pending: balance.pending?.[0]?.amount || 0,
        currency: balance.available?.[0]?.currency || 'usd',
      },
      payoutSchedule: {
        interval: account.settings?.payouts?.schedule?.interval || 'manual',
        delayDays: account.settings?.payouts?.schedule?.delay_days || 2,
        weeklyAnchor: account.settings?.payouts?.schedule?.weekly_anchor,
        monthlyAnchor: account.settings?.payouts?.schedule?.monthly_anchor,
      },
      payouts: payouts.data.map((payout: any) => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        type: payout.type,
        created: payout.created,
        description: payout.description,
      })),
      instantPayouts: {
        enabled: instantPayoutsEnabled,
        reason: instantPayoutsEnabled ? null : 'Add a debit card in Stripe Dashboard to enable',
      },
      bankAccount: bankAccount ? {
        last4: bankAccount.last4,
        bankName: bankAccount.bank_name,
      } : null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Get payout info error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch payout info',
      details: error.stripeError || null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
