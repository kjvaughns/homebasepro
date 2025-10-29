import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripeGet } from '../_shared/stripe-fetch.ts';
import { CORS_HEADERS, errorResponse, successResponse, handleCorsPrefilight } from '../_shared/http.ts';

serve(async (req) => {
  const corsRes = handleCorsPrefilight(req);
  if (corsRes) return corsRes;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { daysBack = 30 } = await req.json();

    // Get user's organization (providers can only sync their own payments)
    const { data: userOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_account_id')
      .eq('owner_id', user.id)
      .not('stripe_account_id', 'is', null)
      .single();

    if (orgError || !userOrg) {
      return errorResponse('NO_ORG', 'Organization not found or Stripe not connected', 404);
    }

    console.log(`Backfilling payments for last ${daysBack} days for org: ${userOrg.name}`);

    const orgs = [userOrg]; // Only sync for the user's organization

    const startDate = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    let totalSynced = 0;
    const results = [];

    for (const org of orgs) {
      try {
        console.log(`Processing org: ${org.name} (${org.id})`);
        
        let hasMore = true;
        let startingAfter = null;
        let orgSynced = 0;

        while (hasMore) {
          const params = new URLSearchParams({
            created: `${startDate}`,
            limit: '100',
            expand: 'data.charge',
          });

          if (startingAfter) {
            params.append('starting_after', startingAfter);
          }

          const balanceTransactions = await stripeGet(
            `balance_transactions?${params.toString()}`,
            org.stripe_account_id
          );

          for (const txn of balanceTransactions.data) {
            // Check if payment already exists
            const { data: existing } = await supabase
              .from('payments')
              .select('id')
              .eq('stripe_id', txn.source)
              .maybeSingle();

            if (existing) {
              console.log(`Payment already exists: ${txn.source}`);
              continue;
            }

            // Calculate fees
            const amount = txn.amount;
            const stripeFee = Math.abs(txn.fee);
            const net = txn.net;

            // Insert payment record
            const { error: insertError } = await supabase
              .from('payments')
              .insert({
                org_id: org.id,
                type: txn.type,
                status: 'paid',
                amount: amount,
                fee_amount: stripeFee,
                net_amount: net,
                currency: txn.currency,
                stripe_id: txn.source,
                payment_date: new Date(txn.created * 1000).toISOString(),
                captured: true,
                meta: {
                  description: txn.description,
                  reporting_category: txn.reporting_category,
                },
              });

            if (insertError) {
              console.error(`Error inserting payment ${txn.source}:`, insertError);
            } else {
              orgSynced++;
              totalSynced++;

              // Create ledger entries
              await supabase.from('ledger_entries').insert([
                {
                  occurred_at: new Date(txn.created * 1000).toISOString(),
                  type: 'fee',
                  direction: 'debit',
                  amount_cents: stripeFee,
                  currency: txn.currency,
                  stripe_ref: txn.id,
                  party: 'stripe',
                  provider_id: org.id,
                  metadata: { type: 'stripe_fee' },
                },
                {
                  occurred_at: new Date(txn.created * 1000).toISOString(),
                  type: 'transfer',
                  direction: 'credit',
                  amount_cents: net,
                  currency: txn.currency,
                  stripe_ref: txn.id,
                  party: 'provider',
                  provider_id: org.id,
                  metadata: { type: 'net_transfer' },
                },
              ]);
            }
          }

          hasMore = balanceTransactions.has_more;
          if (hasMore && balanceTransactions.data.length > 0) {
            startingAfter = balanceTransactions.data[balanceTransactions.data.length - 1].id;
          }
        }

        results.push({
          organizationId: org.id,
          name: org.name,
          synced: orgSynced,
        });

        console.log(`Completed org ${org.name}: ${orgSynced} payments synced`);
      } catch (orgError: any) {
        console.error(`Error processing org ${org.name}:`, orgError);
        results.push({
          organizationId: org.id,
          name: org.name,
          error: orgError.message,
        });
      }
    }

    return successResponse({
      message: `Backfill complete`,
      totalSynced,
      organizations: results,
    });
  } catch (error: any) {
    console.error('Backfill error:', error);
    return errorResponse('BACKFILL_ERROR', error.message, 500);
  }
});
