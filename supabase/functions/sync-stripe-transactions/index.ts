import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('sync-stripe-transactions function starting');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request params
    const { organizationId, daysBack = 90 } = await req.json();

    // Verify admin or organization owner
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if admin
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    let organizations = [];

    if (adminCheck) {
      // Admin can sync all organizations
      if (organizationId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        if (org) organizations.push(org);
      } else {
        const { data: allOrgs } = await supabase
          .from('organizations')
          .select('*')
          .not('stripe_account_id', 'is', null);
        organizations = allOrgs || [];
      }
    } else {
      // Regular user can only sync their own organization
      const { data: userOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .not('stripe_account_id', 'is', null)
        .single();
      if (userOrg) organizations.push(userOrg);
    }

    if (organizations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No organizations found with Stripe accounts' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    let totalSynced = 0;
    const results = [];

    for (const org of organizations) {
      console.log(`Syncing transactions for org ${org.id} (${org.name})`);
      
      try {
        let hasMore = true;
        let startingAfter: string | undefined = undefined;
        let orgSynced = 0;

        while (hasMore) {
          // Fetch balance transactions from Stripe
          let path = `balance_transactions?limit=100&created[gte]=${startTimestamp}`;
          if (startingAfter) path += `&starting_after=${startingAfter}`;

          const response = await stripeGet(path, org.stripe_account_id);
          
          for (const txn of response.data) {
            // Check if transaction already exists
            const { data: existing } = await supabase
              .from('payments')
              .select('id')
              .eq('stripe_payment_intent_id', txn.source)
              .maybeSingle();

            if (existing) {
              console.log(`Transaction ${txn.id} already exists, skipping`);
              continue;
            }

            // Calculate platform fee
            const feeDetails = txn.fee_details || [];
            const applicationFee = feeDetails.find((f: any) => f.type === 'application_fee');
            const stripeFee = feeDetails.find((f: any) => f.type === 'stripe_fee');

            // Insert payment record
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                org_id: org.id,
                stripe_payment_intent_id: txn.source,
                stripe_id: txn.id,
                amount: txn.amount,
                fee_amount: stripeFee?.amount || 0,
                application_fee_cents: applicationFee?.amount || 0,
                net_amount: txn.net,
                currency: txn.currency,
                status: txn.status === 'available' ? 'paid' : 'pending',
                payment_date: new Date(txn.created * 1000).toISOString(),
                metadata: {
                  type: txn.type,
                  description: txn.description,
                  reporting_category: txn.reporting_category,
                }
              });

            if (paymentError) {
              console.error(`Error inserting payment:`, paymentError);
              continue;
            }

            // Insert ledger entries
            if (applicationFee?.amount) {
              await supabase.from('ledger_entries').insert({
                occurred_at: new Date(txn.created * 1000).toISOString(),
                type: 'fee',
                direction: 'credit',
                amount_cents: applicationFee.amount,
                currency: txn.currency,
                stripe_ref: txn.id,
                party: 'platform',
                provider_id: org.id,
                metadata: { transaction_type: txn.type }
              });
            }

            await supabase.from('ledger_entries').insert({
              occurred_at: new Date(txn.created * 1000).toISOString(),
              type: 'transfer',
              direction: 'credit',
              amount_cents: txn.net,
              currency: txn.currency,
              stripe_ref: txn.id,
              party: 'provider',
              provider_id: org.id,
              metadata: { transaction_type: txn.type }
            });

            orgSynced++;
          }

          hasMore = response.has_more;
          if (hasMore && response.data.length > 0) {
            startingAfter = response.data[response.data.length - 1].id;
          }
        }

        totalSynced += orgSynced;
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          transactionsSynced: orgSynced
        });

        console.log(`✅ Synced ${orgSynced} transactions for ${org.name}`);
      } catch (error) {
        console.error(`Error syncing org ${org.id}:`, error);
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalTransactionsSynced: totalSynced,
        organizationsProcessed: organizations.length,
        details: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-stripe-transactions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
