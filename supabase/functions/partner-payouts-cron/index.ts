import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const MINIMUM_PAYOUT = 50; // $50 minimum

Deno.serve(async (req) => {
  console.log('🔄 Starting automated partner payouts...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active partners with Connect accounts
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .eq('status', 'ACTIVE')
      .not('stripe_account_id', 'is', null);

    if (partnersError) throw partnersError;

    console.log(`📊 Found ${partners?.length || 0} active partners`);

    const results: {
      successful: { partner: string; amount: number; transferId: string }[];
      failed: { partner: string; error: string }[];
      skipped: { partner: string; reason: string }[];
    } = {
      successful: [],
      failed: [],
      skipped: [],
    };

    for (const partner of partners || []) {
      try {
        // Get last payout date
        const { data: lastPayout } = await supabase
          .from('partner_payouts')
          .select('payout_date')
          .eq('partner_id', partner.id)
          .order('payout_date', { ascending: false })
          .limit(1)
          .single();

        const since = lastPayout?.payout_date || '1970-01-01';

        // Get pending commissions
        const { data: commissions, error: commissionsError } = await supabase
          .from('partner_commissions')
          .select('*')
          .eq('partner_id', partner.id)
          .eq('status', 'PENDING')
          .gte('created_at', since);

        if (commissionsError) throw commissionsError;

        const totalAmount = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;

        console.log(`💰 Partner ${partner.referral_code}: $${totalAmount.toFixed(2)} pending`);

        // Check minimum threshold
        if (totalAmount < MINIMUM_PAYOUT) {
          results.skipped.push({
            partner: partner.referral_code,
            reason: `Below minimum ($${totalAmount.toFixed(2)} < $${MINIMUM_PAYOUT})`,
          });
          continue;
        }

        // Create Stripe Transfer
        const transferResponse = await fetch('https://api.stripe.com/v1/transfers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: Math.round(totalAmount * 100).toString(),
            currency: 'usd',
            destination: partner.stripe_account_id,
            description: `Partner commission payout - ${new Date().toLocaleDateString()}`,
          }),
        });

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          throw new Error(errorData.error?.message || 'Stripe transfer failed');
        }

        const transfer = await transferResponse.json();

        // Create payout record
        const { error: payoutError } = await supabase
          .from('partner_payouts')
          .insert({
            partner_id: partner.id,
            amount: totalAmount,
            status: 'COMPLETED',
            stripe_transfer_id: transfer.id,
            payout_date: new Date().toISOString(),
          });

        if (payoutError) throw payoutError;

        // Mark commissions as paid
        const commissionIds = commissions?.map(c => c.id) || [];
        const { error: updateError } = await supabase
          .from('partner_commissions')
          .update({ status: 'PAID' })
          .in('id', commissionIds);

        if (updateError) throw updateError;

        // Send notification email
        await supabase.functions.invoke('send-partner-email', {
          body: {
            type: 'partner-payout',
            to: partner.email,
            data: {
              partnerName: partner.business_name || partner.contact_name,
              amount: totalAmount,
              transferId: transfer.id,
              commissionsCount: commissions?.length || 0,
            },
          },
        });

        results.successful.push({
          partner: partner.referral_code,
          amount: totalAmount,
          transferId: transfer.id,
        });

        console.log(`✅ Payout sent to ${partner.referral_code}: $${totalAmount.toFixed(2)}`);
      } catch (error: any) {
        console.error(`❌ Failed to process ${partner.referral_code}:`, error);
        results.failed.push({
          partner: partner.referral_code,
          error: error.message,
        });

        // Create failed payout record
        await supabase
          .from('partner_payouts')
          .insert({
            partner_id: partner.id,
            amount: 0,
            status: 'FAILED',
            payout_date: new Date().toISOString(),
          });
      }
    }

    console.log('✅ Payout cron completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Cron worker failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
