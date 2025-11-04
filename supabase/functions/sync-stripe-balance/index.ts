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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting Stripe balance sync...');

    // Get all organizations with Stripe accounts
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id')
      .not('stripe_account_id', 'is', null);

    if (orgsError) throw orgsError;

    let syncedCount = 0;
    let errorCount = 0;

    for (const org of orgs || []) {
      try {
        // Fetch balance
        const balance = await stripeGet('balance', org.stripe_account_id);
        const available = balance.available?.[0]?.amount || 0;
        const pending = balance.pending?.[0]?.amount || 0;

        // Store balance snapshot
        await supabase
          .from('balance_snapshots')
          .insert({
            organization_id: org.id,
            available_cents: available,
            pending_cents: pending,
            currency: balance.available?.[0]?.currency || 'usd',
          });

        // Fetch and sync payouts
        const payouts = await stripeGet(`payouts?limit=50`, org.stripe_account_id);

        for (const payout of payouts.data || []) {
          await supabase
            .from('stripe_payouts')
            .upsert({
              organization_id: org.id,
              stripe_payout_id: payout.id,
              amount_cents: payout.amount,
              currency: payout.currency,
              status: payout.status,
              arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
              payout_type: payout.type || 'standard',
              fee_cents: payout.fee || 0,
              description: payout.description,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_payout_id',
            });
        }

        syncedCount++;
        console.log(`Synced data for org ${org.id}`);
      } catch (error: any) {
        console.error(`Error syncing org ${org.id}:`, error.message);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      syncedOrganizations: syncedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Sync failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
